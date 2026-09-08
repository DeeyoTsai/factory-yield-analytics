const { EdcRecord, EdcSegment, EdcFlaggedGlass, EdcGlassComment, EdcGlassRecord } = require('../models');
const { Op } = require('sequelize');
const { DEFAULT_CONFIG } = require('../domain/edcAnalysis');
const { EDC_STATION_MACHINE_PAIRS } = require('../config/stations');

// 固定站別順序（依 config/stations.js 的配對），彙總表由上到下依此排列，不用字母排序。
const STATION_ORDER = EDC_STATION_MACHINE_PAIRS.map(([station]) => station);

// GET /api/edc/summary?day=YYYY-MM-DD — 第 1 層：各站別 by 品種 彙總，
// 只列最大全距+燈號，不逐段列出——多個 relogin 造成的段落在這裡合併成一列，避免列太多雜資訊。
// 站別/機台為固定一對一配對，故不另外用機台分組。
exports.listSummary = async (req, res) => {
  try {
    const { day } = req.query;
    if (!day) return res.status(400).json({ message: 'day is required (YYYY-MM-DD)' });

    // ⚠️ attributes 一定要列舉：不指定的話 Sequelize 會 SELECT *，把每段的 stats（JSON/longtext）
    // 也撈回來，而這裡只需要算最大全距的幾個小數字欄位——白白拖慢查詢、吃記憶體。
    const segments = await EdcSegment.findAll({
      attributes: ['recipe', 'glass_count', 'max_range', 'max_range_column', 'over_spec_columns', 'over_spec', 'event_start', 'event_end'],
      include: [{
        model: EdcRecord, as: 'record', where: { day },
        attributes: ['station', 'machine', 'day', 'shift', 'window_start', 'window_end'],
      }],
    });

    // 分組 key 多帶 shift——同一天可能有日班/夜班/自訂查詢三筆各自獨立的 EdcRecord，
    // 不能只用 station+recipe 分組，否則會把不同班別的段落錯誤合併成同一列
    const groups = new Map();
    for (const s of segments) {
      const plain = s.get({ plain: true });
      const key = `${plain.record.station}|${plain.recipe}|${plain.record.shift}`;
      if (!groups.has(key)) {
        groups.set(key, {
          station: plain.record.station,
          machine: plain.record.machine,
          recipe: plain.recipe,
          shift: plain.record.shift,
          windowStart: plain.record.window_start,
          windowEnd: plain.record.window_end,
          segmentCount: 0,
          glassCount: 0,
          maxRange: 0,
          maxRangeColumn: null,
          // 該群組（可能跨多段）所有超規格欄位的聯集。用 Map 而非 Set：同一欄可能在多段都超規，
          // 要留住「最大的那個全距」才能依嚴重度排序（前端表格要把最嚴重的排前面）。
          overSpecColumnRanges: new Map(),
          overSpec: false,
          eventStart: plain.event_start,
          eventEnd: plain.event_end,
        });
      }
      const g = groups.get(key);
      g.segmentCount += 1;
      g.glassCount += plain.glass_count;
      if (plain.max_range > g.maxRange) { g.maxRange = plain.max_range; g.maxRangeColumn = plain.max_range_column; }
      if (plain.over_spec) g.overSpec = true;
      // over_spec_columns 是逗號串接、段內已依全距由大到小排；跨段合併時用「該欄在各段的最大全距」
      // 當排序依據。這裡沒有逐欄的全距數值（那在 stats longtext 裡，刻意不撈），改用段的 max_range
      // 當近似排序權重——同段內的相對順序已由字串順序保留，跨段則以段的嚴重度排先後。
      for (const col of (plain.over_spec_columns || '').split(',').filter(Boolean)) {
        const prev = g.overSpecColumnRanges.get(col) ?? -Infinity;
        if (plain.max_range > prev) g.overSpecColumnRanges.set(col, plain.max_range);
      }
      if (!g.eventStart || plain.event_start < g.eventStart) g.eventStart = plain.event_start;
      if (!g.eventEnd || plain.event_end > g.eventEnd) g.eventEnd = plain.event_end;
    }

    // Map 不能直接 JSON 序列化，轉成依嚴重度排序的欄位名陣列再回給前端
    for (const g of groups.values()) {
      g.overSpecColumns = [...g.overSpecColumnRanges.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([col]) => col);
      delete g.overSpecColumnRanges;
    }

    const list = [...groups.values()].sort((a, b) =>
      STATION_ORDER.indexOf(a.station) - STATION_ORDER.indexOf(b.station)
      || a.recipe.localeCompare(b.recipe) || a.shift.localeCompare(b.shift));

    res.status(200).json({ groups: list });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/edc/group/flagged?day=&station=&recipe= — 第 2 層：該 (站別,品種) 群組的異常基板 + by shot 折線資料。
// 一個群組可能因重登斷層被切成多段，這裡把多段的 flagged glass / flagged_series 合併回同一份清單/序列。
exports.getGroupFlagged = async (req, res) => {
  try {
    const { day, station, recipe, shift } = req.query;
    if (!day || !station || !recipe || !shift) {
      return res.status(400).json({ message: 'day/station/recipe/shift are required' });
    }

    // ⚠️ 這裡刻意「不」在 SQL 層 ORDER BY，改在下面用 JS 排序。
    // 起因：2026-08-05 前這張表還有個 `series` longtext（單段可達 2MB），帶 ORDER BY 時
    // MariaDB 的 filesort 會把整列（含 longtext）塞進 sort_buffer，單列就超過上限 → 直接回
    // `Out of sort memory, consider increasing server sort buffer size`，且只有 glass 數大的
    // 站別會炸，症狀是前端第二層整頁空白 + console axiosError。
    // series 已移除（改存 edc_glass_records），但 `stats` 仍是 JSON/longtext，同樣的地雷還在，
    // 所以維持在 JS 排序——段數只有個位數，零成本。也不要改去調 MySQL 的 sort_buffer_size
    // （治標，換台機器/換組態又會犯）。
    const segments = await EdcSegment.findAll({
      where: { recipe },
      include: [{ model: EdcRecord, as: 'record', where: { day, station, shift }, attributes: ['station', 'machine', 'day', 'shift'] }],
    });
    // 依實際時間排序而非存在 DB 裡的 segment_index——因為 segment_index 是每筆 EdcRecord 各自從 0 起算，
    // 前端顯示的「第N段」改用陣列順序（index+1），不能直接顯示原始 segment_index
    segments.sort((a, b) => String(a.event_start).localeCompare(String(b.event_start)));
    if (!segments.length) {
      return res.status(200).json({ flaggedGlass: [], byColumn: {}, segments: [], outlierThreshold: DEFAULT_CONFIG.outlierThreshold });
    }

    const segmentIds = segments.map((s) => s.id);
    const flaggedGlassRows = await EdcFlaggedGlass.findAll({
      where: { edc_segment_id: { [Op.in]: segmentIds } },
      order: [['column_name', 'ASC'], ['event_datetime', 'ASC']],
    });

    const rangeSpec = DEFAULT_CONFIG.rangeSpec;

    // 監控欄位＝各段 stats 的 key 聯集（stats 只含該批實際有非零值的監控欄位）。
    // 折線圖的逐點資料改從 edc_glass_records 撈（2026-08-05 起 edc_segments.series 已移除，
    // 見 models/EdcGlassRecord.js）——同一片 glass 只存一列，不再依欄位重複抄 glass_id/時間。
    const columns = new Set();
    for (const seg of segments) for (const col of Object.keys(seg.stats || {})) columns.add(col);
    const columnList = [...columns];

    // 一次把這幾段的所有 glass 撈回來，再於記憶體裡分組成「逐段 × 逐欄」的序列。
    // 只 SELECT 需要的欄位，避免把 6 個 shot 全部 54 欄都拉回來（多數品種只用到前 2~4 個 shot）。
    const glassRows = columnList.length
      ? await EdcGlassRecord.findAll({
        where: { edc_segment_id: { [Op.in]: segmentIds } },
        attributes: ['edc_segment_id', 'glass_id', 'event_datetime', ...columnList],
      })
      : [];
    const rowsBySegment = new Map(segmentIds.map((id) => [id, []]));
    for (const r of glassRows) rowsBySegment.get(r.edc_segment_id)?.push(r);
    // 折線圖要照時間順序連線；event_datetime 是 'YYYY-MM-DD HH:mm:ss' 定長字串，字典序＝時間序
    for (const list of rowsBySegment.values()) {
      list.sort((a, b) => String(a.event_datetime).localeCompare(String(b.event_datetime)));
    }

    const byColumn = {};
    for (const col of columnList) {
      const segData = segments.map((seg) => {
        const st = (seg.stats || {})[col] || {};
        return {
          segment_index: seg.segment_index,
          boundary_reason: seg.boundary_reason,
          recipe: seg.recipe,
          min: st.min, max: st.max, avg: st.avg, median: st.median, range: st.range,
          overSpec: st.range != null && st.range >= rangeSpec,
          points: (rowsBySegment.get(seg.id) || [])
            .filter((r) => r[col] !== null && r[col] !== undefined)
            .map((r) => ({ glass_id: r.glass_id, event_datetime: r.event_datetime, value: r[col] })),
        };
      });
      byColumn[col] = {
        overSpec: segData.some((s) => s.overSpec),
        groupMaxRange: Math.max(0, ...segData.map((s) => s.range || 0)),
        segments: segData,
      };
    }

    const glassIds = [...new Set(flaggedGlassRows.map((f) => f.glass_id))];
    const columnNames = [...new Set(flaggedGlassRows.map((f) => f.column_name))];
    const comments = glassIds.length
      ? await EdcGlassComment.findAll({
        where: { day, station, glass_id: { [Op.in]: glassIds }, column_name: { [Op.in]: columnNames } },
      })
      : [];
    const commentKey = (c) => `${c.glass_id}|${c.column_name}`;
    const commentMap = new Map(comments.map((c) => [commentKey(c), c]));

    res.status(200).json({
      flaggedGlass: flaggedGlassRows.map((f) => {
        const plain = f.get({ plain: true });
        const c = commentMap.get(commentKey(plain));
        return { ...plain, confirmed: c ? c.confirmed : false, comment: c ? c.comment : '' };
      }),
      byColumn,
      // OOS 上下限線用「中位數 ± outlierThreshold」畫（逐段各自的中位數）；門檻由後端單一來源提供，前端不寫死。
      outlierThreshold: DEFAULT_CONFIG.outlierThreshold,
      // 段落 meta（給第二層頂部 chip 用）
      segments: segments.map((s) => ({
        id: s.id, segment_index: s.segment_index, event_start: s.event_start, event_end: s.event_end,
        glass_count: s.glass_count, boundary_reason: s.boundary_reason, recipe: s.recipe,
        max_range: s.max_range, max_range_column: s.max_range_column, over_spec: s.over_spec,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PUT /api/edc/comment — upsert 人工確認/註解（自然鍵；資料匯入永不觸碰這張表）
exports.upsertComment = async (req, res) => {
  try {
    const { day, station, machine, glass_id, column_name, confirmed, comment } = req.body;
    if (!day || !station || !machine || !glass_id || !column_name) {
      return res.status(400).json({ message: 'day/station/machine/glass_id/column_name are required' });
    }
    const [row] = await EdcGlassComment.findOrCreate({
      where: { day, station, machine, glass_id, column_name },
      defaults: { confirmed: !!confirmed, comment: comment || '', employee: req.user?.employee },
    });
    await row.update({ confirmed: !!confirmed, comment: comment || '', employee: req.user?.employee });
    res.status(200).json({ comment: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/edc/crawl — 開源版沒有背景爬蟲。
// EDC 資料透過 ingestion adapter 匯入（`npm run seed` 用內建 seedAdapter；
// 要接自己的來源見 docs/ingestion.md）。保留這支端點是為了讓前端的「手動觸發」按鈕
// 不會壞掉，只是回一段說明。
exports.crawlNow = (req, res) => {
  res.status(202).json({
    started: false,
    message:
      '此版本沒有背景爬蟲。EDC 資料由 ingestion adapter 匯入：' +
      '執行 `npm run seed` 灌 demo 資料，或實作自己的 adapter（見 docs/ingestion.md）。',
  });
};

// GET /api/edc/crawl/status — 前端每 4s 輪詢，固定回「閒置」。
exports.crawlStatus = (req, res) => {
  res.status(200).json({
    running: false,
    lastRunAt: null,
    cooldownRemainingSec: 0,
    message: 'ingestion adapter 模式，無背景爬蟲',
  });
};
