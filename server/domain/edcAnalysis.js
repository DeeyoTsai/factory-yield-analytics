'use strict';

// EDC 曝光對位（alignment）全距 SPC 監控 — 核心演算法（純函式、無 IO、可單元測試）。
//
// 輸入 rows 形狀（呼叫端負責把來源資料轉成這個乾淨形狀）：
//   { glass_id, event_datetime: Date, recipe, Shot1_Final_Align_T, Shot1_Final_FRX, ... }
// 監控欄位（Shot{n}_Final_{Align_T|FRX|FRY|FLX|FLY|RLX|RLY|RRX|RRY}）由 deriveMonitorColumns()
// 動態掃描實際存在且有值的欄位，而非寫死 6 個 shot —— 因為 shot 數隨品種變動，且觀察到
// Shot6 這批資料本身缺 Final_Align_T（只有 Final_Align_Y1），寫死清單會直接 crash 或漏算。

// 監控欄位＝每個 shot 的四角點 8 欄。2026-08-05 起 `Align_T` 已從監控與落地範圍中移除
// （Dave：現場沒在看這個角度偏移量），所以這裡的 regex 也不再包含它——若之後要加回來，
// 除了改這條 regex，還要在 models/EdcGlassRecord.js 補回對應欄位，否則資料不會落地。
const MONITOR_COLUMN_RE = /^Shot(\d+)_Final_(FRX|FRY|FLX|FLY|RLX|RLY|RRX|RRY)$/;
const EXPOSE_COLUMN_RE = /^Shot(\d+)_Expose$/;

const DEFAULT_CONFIG = {
  // 分段硬邊界只剩「品種變更」。曾經加過的 07:00/19:00 換班別硬切已移除——alignment 基準線是機台/對位
  // mark 的物理屬性，不會因為換班就重設；真正造成基準位移的是換品種或重登，換班本身不該切段。
  gapMinSec: 180,        // 判定「多分鐘間隔」的門檻；正常片間節拍約 47~60s
  changepointWindow: 20, // 變點偵測用的前/後窗大小（枚）
  changepointShift: 1.0, // 前後窗中位數位移超過此值才算「值變點」
  minRun: 15,            // 位移後段尾至少要有這麼多枚可驗證「持續」，避免把單枚雜訊瞬跳當重登
  rangeSpec: 4,          // 全距 >= 此值才標記為超規格（全距 > 4 視為異常）
  outlierThreshold: 2,   // 三情況離群邏輯的 h1/h2 閥值 T（判斷「贏家」自己是否夠顯著）
  closenessRatio: 0.3,   // h1/h2 差距 < 全距 * 此比例 → 判定分不出兇手，max/min 都標
};

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(values) {
  const xs = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

/**
 * 濾除「未曝光」的 glass（Shot1~6_Expose 全為 0），濾除未曝光片的前處理。
 *
 * EDC 對這種列不是留空白，而是整列所有 Shot 欄位（含 alignment 各角點）全部填 0，
 * 常伴隨 PROCESS_COMPLETE=0000。若不濾掉，正常值約 3~5 的欄位混進一個 0，
 * 會把 min 直接拉到 0、全距瞬間 +4~5，造成假的超規格告警，離群邏輯也會把這枚
 * 當成兇手標出來——這不是統計異常，只是那片根本沒曝光。
 *
 * 防呆：若該批資料完全找不到任何 Shot{n}_Expose 欄位（例如未來欄位改名），
 * 不做任何濾除、原封不動回傳，避免整批資料被誤刪成空。
 */
function filterUnexposedRows(rows) {
  const exposeCols = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (EXPOSE_COLUMN_RE.test(key)) exposeCols.add(key);
    }
  }
  if (!exposeCols.size) return rows;
  return rows.filter((r) => [...exposeCols].some((c) => {
    const v = toNumber(r[c]);
    return v !== null && v !== 0;
  }));
}

// 掃描實際存在、且該批有「非零」數值的監控欄位。EDC 系統對沒曝光的 shot 不是留空白，
// 而是整欄填 0（樣本的 Shot5/6 整欄恆為 0，並非缺值）——
// 所以只看「有沒有值」不夠，必須排除「整段全是 0」的欄位，才不會把沒用到的 shot 也當成監控目標。
function deriveMonitorColumns(rows) {
  const candidates = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (MONITOR_COLUMN_RE.test(key)) candidates.add(key);
    }
  }
  return [...candidates]
    .filter((col) => rows.some((r) => { const v = toNumber(r[col]); return v !== null && v !== 0; }))
    .sort((a, b) => {
      const [, sa] = a.match(MONITOR_COLUMN_RE);
      const [, sb] = b.match(MONITOR_COLUMN_RE);
      return Number(sa) - Number(sb) || a.localeCompare(b);
    });
}

// 第一刀：依「品種變更」切硬邊界（無條件切，不看數值）。換班別不再切段（見 DEFAULT_CONFIG 說明）。
function splitHardRuns(rows) {
  const runs = [];
  let current = [];
  let prevRecipe = null;
  for (const row of rows) {
    const isBoundary = current.length > 0 && row.recipe !== prevRecipe;
    if (isBoundary) {
      runs.push({ rows: current });
      current = [];
    }
    current.push(row);
    prevRecipe = row.recipe;
  }
  if (current.length) runs.push({ rows: current });
  runs.forEach((run, i) => { run.boundaryReason = i === 0 ? 'start' : 'recipe'; });
  return runs;
}

// 第二刀（僅在同品種的硬邊界區間內執行）：多分鐘間隔 AND 值變點，兩者同時成立才切（缺一不切）。
// 純大間隔無位移＝待機空檔（不切）；純位移無間隔＝製程漂移或雜訊（不切）——見資料佐證：
// 合成樣本第77枚 8.4min間隔+中位數位移 → 真重登斷層；idx127/213/510 大間隔卻無位移 → idle 不切。
function splitSoftBoundaries(hardRunRows, monitorColumns, config) {
  const boundaryIdxs = [0];
  for (let i = 1; i < hardRunRows.length; i++) {
    const gapSec = (hardRunRows[i].event_datetime - hardRunRows[i - 1].event_datetime) / 1000;
    if (gapSec <= config.gapMinSec) continue;

    const segStart = boundaryIdxs[boundaryIdxs.length - 1];
    const beforeWin = hardRunRows.slice(Math.max(segStart, i - config.changepointWindow), i);
    const afterWin = hardRunRows.slice(i, Math.min(hardRunRows.length, i + config.changepointWindow));
    if (beforeWin.length < 3 || afterWin.length < 3) continue; // 樣本太少無法可靠判斷，保守不切
    if (hardRunRows.length - i < config.minRun) continue;      // 段尾樣本不足以驗證位移「持續」，保守不切

    const hasShift = monitorColumns.some((col) => {
      const b = median(beforeWin.map((r) => toNumber(r[col])));
      const a = median(afterWin.map((r) => toNumber(r[col])));
      return b !== null && a !== null && Math.abs(a - b) > config.changepointShift;
    });
    if (hasShift) boundaryIdxs.push(i);
  }
  return boundaryIdxs.map((startIdx, idx) => {
    const endIdx = idx + 1 < boundaryIdxs.length ? boundaryIdxs[idx + 1] : hardRunRows.length;
    return { rows: hardRunRows.slice(startIdx, endIdx), boundaryReason: idx === 0 ? null : 'relogin' };
  });
}

/**
 * 把時序 rows 切成「同基準線」的若干段。
 * @returns {{ segments: Array<{rows, boundaryReason}>, monitorColumns: string[] }}
 */
function segmentRows(rows, config = DEFAULT_CONFIG) {
  const sorted = [...rows].sort((a, b) => a.event_datetime - b.event_datetime);
  const monitorColumns = deriveMonitorColumns(sorted);
  const hardRuns = splitHardRuns(sorted);

  const segments = [];
  for (const run of hardRuns) {
    const softSegments = splitSoftBoundaries(run.rows, monitorColumns, config);
    softSegments.forEach((seg, segIdx) => {
      segments.push({
        rows: seg.rows,
        boundaryReason: segIdx === 0 ? run.boundaryReason : seg.boundaryReason,
      });
    });
  }
  return { segments, monitorColumns };
}

// 段內、逐監控欄位算 min/max/avg/median/全距；全距 >= rangeSpec 時用三情況離群邏輯挑兇手 glass
function analyzeSegment(segRows, monitorColumns, config) {
  const stats = {};
  const flaggedByColumn = {};
  let maxRange = 0;
  let maxRangeColumn = null;

  for (const col of monitorColumns) {
    const rowsWithValue = segRows.filter((r) => toNumber(r[col]) !== null);
    if (!rowsWithValue.length) continue;

    const values = rowsWithValue.map((r) => toNumber(r[col]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const med = median(values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const range = max - min;
    stats[col] = { min, max, avg, median: med, range };
    if (range > maxRange) { maxRange = range; maxRangeColumn = col; }

    if (range >= config.rangeSpec) {
      // 離群邏輯：中心點用中位數（非平均），避免離群值自己把中心拉歪。
      // 恆等式 h1+h2=全距；T(outlierThreshold) 的語意＝「一端要離中位數多遠才算兇手」。
      //
      // 步驟：
      //  (1) 先產生「候選端」——① h1/h2 差距太接近（<closenessRatio×全距）→ 分不出主兇手，
      //      max/min 兩端都列候選；② 差距夠大 → 取較遠的一端（贏家），贏家 >T 就只列贏家，
      //      否則兩端都列候選。
      //  (2) 候選端再過「管制線」：只有該端自己 h > T（確實超出中位數±T）才真的標記。
      //      全距達標、但分布其實很平均時，貼著管制線的極值不算異常、不標紅——
      //      這是刻意的，避免圖上出現「紅點落在管制線內」的怪現象。
      //  (3) 保底：(2) 過濾後若一端都不剩（只會在自訂 rangeSpec<2T、或全距剛好=rangeSpec
      //      且分布完全對稱時發生），退回標「h 較大的那一端」一枚（tie 取 max），
      //      維持「超規格欄位必定挑得出至少一個兇手」這個下游依賴的不變量。
      const h1 = max - med;
      const h2 = med - min;
      const maxRow = rowsWithValue.reduce((a, b) => (toNumber(b[col]) > toNumber(a[col]) ? b : a));
      const minRow = rowsWithValue.reduce((a, b) => (toNumber(b[col]) < toNumber(a[col]) ? b : a));
      const maxSide = { row: maxRow, side: 'max' };
      const minSide = { row: minRow, side: 'min' };

      let candidates;
      if (Math.abs(h1 - h2) < config.closenessRatio * range) {
        candidates = [maxSide, minSide];
      } else if (h1 > h2) {
        candidates = h1 > config.outlierThreshold ? [maxSide] : [maxSide, minSide];
      } else {
        candidates = h2 > config.outlierThreshold ? [minSide] : [maxSide, minSide];
      }

      const hOf = (f) => (f.side === 'max' ? h1 : h2);
      let flagged = candidates.filter((f) => hOf(f) > config.outlierThreshold);
      if (!flagged.length) flagged = [h1 >= h2 ? maxSide : minSide];

      flaggedByColumn[col] = {
        median: med,
        range,
        flagged: flagged.map((f) => ({
          glass_id: f.row.glass_id, event_datetime: f.row.event_datetime, value: toNumber(f.row[col]), side: f.side,
        })),
      };
    }
  }

  // 超規格欄位清單（全距 >= rangeSpec 的所有欄位，依全距由大到小排）。
  // 第一層匯總表要列出「全部」超規格欄位，不能只給 maxRangeColumn 一個——同一段常常
  // 好幾個角點一起超規（例如整片基板歪掉時 FRY/FLY/RLY/RRY 會一起爆）。
  const overSpecColumns = Object.keys(stats)
    .filter((col) => stats[col].range >= config.rangeSpec)
    .sort((a, b) => stats[b].range - stats[a].range);

  return {
    stats, maxRange, maxRangeColumn, overSpec: maxRange >= config.rangeSpec,
    overSpecColumns, flaggedByColumn,
  };
}

/**
 * 對單一 station × machine 的一天資料跑完整分析：分段 → 段內全距 → 離群。
 * 品種切分與重登斷層在內部處理，呼叫端只需保證同一 station+machine 的 rows 一起傳入。
 *
 * 每段回傳 `rows`（該段的原始 glass 列，已濾除未曝光片），由 edcStore 逐片寫進
 * `edc_glass_records`。**2026-08-05 前這裡回傳的是 `series`**（`{ [欄位]: [{glass_id,
 * event_datetime, value}] }`），會把 glass_id 與時間戳在每個監控欄位重抄一遍（8 個角點 = 8 遍），
 * 實測 95% 的體積都是重複的 id／時間／欄位名；改成落地成真欄位表後，前端要的逐欄序列由
 * edcController 從 `edc_glass_records` 組出來，體積更小、資料更完整、還能直接下 SQL 查。
 *
 * @returns {Array} 每段：{ segmentIndex, eventStart, eventEnd, glassCount, recipe, boundaryReason,
 *   stats(所有欄 min/max/avg/median/range), maxRange, maxRangeColumn, overSpec, flaggedByColumn(離群),
 *   rows(該段原始 glass 列) }
 */
function analyzeEdcData(rows, config = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  // 先濾掉未曝光的 glass 再分段——這些列所有 Shot 欄位都是 0，留著會污染全距與離群判斷
  const exposed = filterUnexposedRows(rows);
  if (!exposed.length) return [];
  const { segments, monitorColumns } = segmentRows(exposed, merged);

  return segments.map((seg, idx) => {
    const analysis = analyzeSegment(seg.rows, monitorColumns, merged);
    const first = seg.rows[0];
    const last = seg.rows[seg.rows.length - 1];
    return {
      segmentIndex: idx,
      eventStart: first.event_datetime,
      eventEnd: last.event_datetime,
      glassCount: seg.rows.length,
      recipe: first.recipe,
      boundaryReason: seg.boundaryReason,
      ...analysis,
      rows: seg.rows,
    };
  });
}

module.exports = {
  DEFAULT_CONFIG,
  MONITOR_COLUMN_RE,
  EXPOSE_COLUMN_RE,
  toNumber,
  median,
  filterUnexposedRows,
  deriveMonitorColumns,
  segmentRows,
  analyzeSegment,
  analyzeEdcData,
};
