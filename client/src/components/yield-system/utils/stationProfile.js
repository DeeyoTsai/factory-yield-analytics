// 站別檢出分布的統計核心（純函式，無 React 依賴，可單元測試）。
//
// 目的：讓人一眼驗證「集中趨勢圖查的站別對不對」。趨勢圖的查詢站是由
// 缺陷 code 首碼（顏色）+ 第一檢出站的線號推出來的，顏色不看站別資料，
// 所以實際檢出最強的站可能根本不是趨勢圖查的那站。

// 製程順序（同 config/stations.js 的 STATIONS）
export const STATIONS = ['BM1', 'BM2', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'AOI'];

// 抽檢站：不是每片都進，數量天生偏低，跨站比較時要提醒使用者
export const SAMPLING_STATIONS = new Set(['L1', 'L2', 'L4', 'L5']);

// ReworkHis 逐站欄位名（小寫），與 STATIONS 對應；AOI 沒有 rework 欄位
const REWORK_KEY = {
  BM1: 'bm1', BM2: 'bm2',
  L1: 'l1', L2: 'l2', L3: 'l3', L4: 'l4', L5: 'l5', L6: 'l6',
};

// ⚠️ 同一台檢查機在兩個欄位可能叫不同名字（inspectstops 用 'AOI'、firststop 用 'Offline_AOI'）；
// 不正規化的話 AOI 那列永遠對不上。
const STATION_ALIAS = { Offline_AOI: 'AOI' };

const normalizeStation = (s) => {
  const v = String(s ?? '').trim();
  return STATION_ALIAS[v] ?? v;
};

/**
 * @param {Array} glassData GlassInfo 陣列（含 include 的 reworkhis），通常傳已依勾選過濾的
 * @returns {{
 *   rows: Array<{station, firstCount, detectedCount, rework, isSampling}>,
 *   maxDetected: number,
 *   others: Array<{name, count}>,
 *   othersTotal: number,
 *   firstStopMode: string|null,
 *   totalGlass: number
 * }}
 */
export function buildStationProfile(glassData = []) {
  const first = {};      // 第一檢出站計數（只算 9 站）
  const detected = {};   // 有檢出計數
  const rework = {};
  for (const s of STATIONS) { first[s] = 0; detected[s] = 0; rework[s] = 0; }

  const others = {};     // firststop 落在 9 站之外的（Unknown / OC2 / MVA / PS1 / PS2）

  // ⚠️ 眾數必須用**未正規化的原始值**，才能重現爬蟲 xlsProcess() 的 topFs：
  //   - 爬蟲的 fsCount 直接吃 GlassInfo.firststop 的原值，沒有排除 Unknown、也沒有 alias
  //   - 之後 topFs.slice(-1) 取末字當線號，所以 'Offline_AOI' → 'I'、'Unknown' → 'n'
  // 若這裡先正規化成 'AOI' 再算眾數，說明列會寫「眾數（AOI）」，與爬蟲實際吃的
  // 'Offline_AOI' 不符，解釋就失準了。
  // （分列用的 first/others 仍走正規化值——'Offline_AOI' 本來就該歸進 AOI 那一列。）
  const rawFirst = {};

  for (const g of glassData) {
    const raw = String(g.firststop ?? '').trim();
    if (raw) rawFirst[raw] = (rawFirst[raw] ?? 0) + 1;

    const fs = normalizeStation(g.firststop);
    if (fs) {
      if (fs in first) first[fs] += 1;
      else others[fs] = (others[fs] ?? 0) + 1;
    }

    // inspectstops 是逗號字串（例 'BM1,L1,L3'）；空字串 split 會產生 ['']，要濾掉
    for (const raw of String(g.inspectstops ?? '').split(',')) {
      const st = normalizeStation(raw);
      if (st && st in detected) detected[st] += 1;
    }

    // ReworkHis 逐站是 INTEGER，預設 -1 代表無資料，不可加總進去
    const rh = g.reworkhis;
    if (rh) {
      for (const s of STATIONS) {
        const key = REWORK_KEY[s];
        if (!key) continue;
        const n = Number(rh[key]);
        if (Number.isFinite(n) && n > 0) rework[s] += n;
      }
    }
  }

  const rows = STATIONS.map((station) => ({
    station,
    firstCount: first[station],
    detectedCount: detected[station],
    rework: rework[station],
    isSampling: SAMPLING_STATIONS.has(station),
  }));

  // 兩條長條共用同一個比例尺（以「有檢出」的最大值為 100%），實心/淡色的落差才有意義
  const maxDetected = Math.max(1, ...rows.map((r) => Math.max(r.detectedCount, r.firstCount)));

  const othersList = Object.entries(others)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 已知未處理：同票時的 tie-break 取決於 key 插入順序。爬蟲照 detailDf 的列順序，
  // 這裡照 GlassInfo.findAll 的回傳順序（該查詢沒有 ORDER BY），兩邊可能挑到不同站。
  // 只影響說明列文字，不影響外框位置（外框吃的是 DB 存的 trendMeta.process）。
  const modeEntry = Object.entries(rawFirst).sort((a, b) => b[1] - a[1])[0];

  return {
    rows,
    maxDetected,
    others: othersList,
    othersTotal: othersList.reduce((sum, o) => sum + o.count, 0),
    firstStopMode: modeEntry ? modeEntry[0] : null,
    totalGlass: glassData.length,
  };
}

export default buildStationProfile;
