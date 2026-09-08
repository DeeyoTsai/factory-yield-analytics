'use strict';

// 演算法單元測試：純 JS + Node 內建 test runner，不需資料庫/內網，Pi 上可直接跑：
//   node server/domain/edcAnalysis.test.js
// 樣本資料為合成（見 __fixtures__/generateEdcSample.js），刻意鋪出可驗證的分段結構。

const test = require('node:test');
const assert = require('node:assert/strict');
const fixtureRows = require('./__fixtures__/edcSample.json');
const { segmentRows, analyzeEdcData, deriveMonitorColumns, filterUnexposedRows, DEFAULT_CONFIG } = require('./edcAnalysis');

// fixture 的 event_datetime 是 ISO 字串，轉成 Date 物件（模組要求的輸入形狀）
const rows = fixtureRows.map((r) => ({ ...r, event_datetime: new Date(r.event_datetime) }));

test('deriveMonitorColumns：只保留實際有用到的 Shot1~4，排除全欄恆為0的 Shot5/6（未曝光）', () => {
  const cols = deriveMonitorColumns(rows);
  assert.ok(cols.includes('Shot1_Final_FRX'));
  assert.ok(cols.includes('Shot4_Final_FLX'));
  assert.ok(!cols.includes('Shot5_Final_FRX'), '樣本 Shot5 全欄恆為0（未曝光），應排除');
  assert.ok(!cols.some((c) => c.includes('Align_T')), 'Align_T 已於 2026-08-05 移出監控範圍');
  assert.ok(!cols.includes('Shot6_Final_FLX'), '樣本 Shot6 全欄恆為0（未曝光），應排除');
});

test('分段：第77枚(8.4min間隔+值變點) 應該切段，idx127/213/510(大間隔但無位移) 不應該切段', () => {
  // 樣本整段同品種，全部落在硬邊界之內，差異只來自 relogin 偵測（換班別已不再切段）
  const { segments } = segmentRows(rows, DEFAULT_CONFIG);

  assert.ok(segments.length >= 2, `應偵測到至少一個 relogin 段界，實際段數=${segments.length}`);

  // 第一段結尾應落在第 77 枚附近（0-indexed row 79 是原始資料列號，第77枚＝陣列 index 77）
  const firstSegLen = segments[0].rows.length;
  assert.ok(firstSegLen >= 70 && firstSegLen <= 85,
    `第一段長度應在 77 枚附近（8.4min間隔+位移處），實際=${firstSegLen}`);

  // idx127/213/510 附近不應該被切成獨立段界（這些是大間隔但無位移的 idle）
  const boundaryStarts = new Set();
  let offset = 0;
  for (const seg of segments) { boundaryStarts.add(offset); offset += seg.rows.length; }
  for (const idleIdx of [127, 213, 510]) {
    const nearBoundary = [...boundaryStarts].some((b) => Math.abs(b - idleIdx) < 5);
    assert.ok(!nearBoundary, `idx${idleIdx} 附近是 idle 待機，不應被當成段界`);
  }
});

test('analyzeEdcData：每段都有 stats/overSpec，全距 >= rangeSpec 的欄位才有 flaggedByColumn', () => {
  const result = analyzeEdcData(rows);
  assert.ok(result.length > 0);
  for (const seg of result) {
    assert.ok(seg.glassCount > 0);
    for (const [col, info] of Object.entries(seg.flaggedByColumn)) {
      assert.ok(seg.stats[col].range >= DEFAULT_CONFIG.rangeSpec,
        `${col} 出現在 flaggedByColumn 但全距未達門檻`);
      assert.ok(info.flagged.length >= 1 && info.flagged.length <= 2);
      assert.ok(Number.isFinite(seg.stats[col].avg), `${col} 應有 avg`);
      // 關注欄位的逐段序列存在
      assert.ok(seg.stats[col] === undefined || typeof seg.stats[col].range === 'number', `${col} 的逐段統計應為數值`);
    }
  }
});

// 2026-08-05：`series` 輸出已移除，改成每段回傳原始 rows，由 edcStore 逐片寫進 edc_glass_records，
// 前端要的逐欄序列由 edcController 從那張表組出來（見 models/EdcGlassRecord.js 的改版說明）。
test('rows：每段回傳該段的原始 glass 列，且加總等於總片數（供 edc_glass_records 逐片落地）', () => {
  const result = analyzeEdcData(rows);
  let total = 0;
  for (const seg of result) {
    assert.ok(Array.isArray(seg.rows), '每段應回傳 rows');
    assert.equal(seg.rows.length, seg.glassCount, 'rows 長度應等於 glassCount');
    assert.equal(seg.series, undefined, 'series 已移除，不應再輸出');
    total += seg.rows.length;
  }
  assert.equal(total, rows.length, '各段 rows 加總應等於輸入片數（此 fixture 無未曝光片）');
});

test('三情況離群邏輯：h1/h2 恆等式 h1+h2=全距 對每個標記欄位成立', () => {
  const result = analyzeEdcData(rows);
  for (const seg of result) {
    for (const [col, info] of Object.entries(seg.flaggedByColumn)) {
      const { min, max, median: med } = seg.stats[col];
      const h1 = max - med;
      const h2 = med - min;
      assert.ok(Math.abs((h1 + h2) - info.range) < 1e-9, `${col} 的 h1+h2 應等於全距`);
    }
  }
});

// ── 未曝光 glass 濾除（濾除未曝光片的前處理）──────────────────────────
// EDC 對未曝光的片不是留空白，而是整列所有 Shot 欄位（含 alignment 角點）全部填 0，
// 常伴隨 process_complete=0000。不濾掉會把 min 拉到 0、全距虛增，造成假的超規格告警。

function exposedRow(id, t, v) {
  return {
    glass_id: id, event_datetime: new Date(t), recipe: 'RCP-A',
    Shot1_Expose: 63.2, Shot2_Expose: 63.5,
    Shot1_Final_FRY: v, Shot1_Final_FLX: 1.2,
  };
}
function unexposedRow(id, t) {
  return {
    glass_id: id, event_datetime: new Date(t), recipe: 'RCP-A',
    Shot1_Expose: 0, Shot2_Expose: 0,
    Shot1_Final_FRY: 0, Shot1_Final_FLX: 0,
  };
}

test('filterUnexposedRows：Shot*_Expose 全為 0 的列被濾除，有任一非零則保留', () => {
  const input = [
    exposedRow('L2', '2026-08-05T07:00:00', 4.9),
    unexposedRow('L5', '2026-08-05T07:01:00'),
    exposedRow('G3', '2026-08-05T07:02:00', 5.1),
  ];
  const out = filterUnexposedRows(input);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((r) => r.glass_id), ['L2', 'G3']);
});

test('filterUnexposedRows：找不到任何 Shot*_Expose 欄位時不做濾除（防呆，避免整批被清空）', () => {
  const input = [{ glass_id: 'L2', event_datetime: new Date('2026-08-05T07:00:00'), recipe: 'R', Shot1_Final_FRY: 0 }];
  assert.equal(filterUnexposedRows(input).length, 1);
});

test('analyzeEdcData：未曝光的 0 值列不會污染全距（濾除前後全距差 4.9）', () => {
  const clean = [
    exposedRow('L2', '2026-08-05T07:00:00', 4.9),
    exposedRow('L5', '2026-08-05T07:01:00', 5.0),
    exposedRow('G3', '2026-08-05T07:02:00', 5.1),
  ];
  const withUnexposed = [...clean, unexposedRow('G0', '2026-08-05T07:03:00')];

  const segs = analyzeEdcData(withUnexposed);
  assert.equal(segs.length, 1);
  const st = segs[0].stats.Shot1_Final_FRY;
  assert.equal(st.min, 4.9, '未曝光的 0 不該被當成 min');
  assert.ok(Math.abs(st.range - 0.2) < 1e-9, `全距應為 0.2（實得 ${st.range}）——若未濾除會變成 5.1`);
  assert.equal(segs[0].overSpec, false, '濾除後不應誤判超規格');
  assert.equal(segs[0].glassCount, 3, '未曝光那枚不該計入 glass 數');
});

test('overSpecColumns：列出該段全部超規格欄位（不只全距最大的），並依全距由大到小排', () => {
  const result = analyzeEdcData(rows);
  const { rangeSpec } = DEFAULT_CONFIG;
  let checkedNonEmpty = false;

  for (const seg of result) {
    const expected = Object.keys(seg.stats).filter((c) => seg.stats[c].range >= rangeSpec);
    assert.deepEqual(
      [...seg.overSpecColumns].sort(),
      expected.sort(),
      '應涵蓋所有 range>=rangeSpec 的欄位',
    );
    // 排序：前一個的全距不得小於後一個
    for (let i = 1; i < seg.overSpecColumns.length; i++) {
      const prev = seg.stats[seg.overSpecColumns[i - 1]].range;
      const cur = seg.stats[seg.overSpecColumns[i]].range;
      assert.ok(prev >= cur, `應由大到小排（${prev} 應 >= ${cur}）`);
    }
    if (seg.overSpecColumns.length) {
      checkedNonEmpty = true;
      // 全距最大的欄位必定是清單第一個
      assert.equal(seg.overSpecColumns[0], seg.maxRangeColumn);
      // flaggedByColumn 的 key 應與超規格欄位一致（離群只在超規格欄位上挑兇手）
      assert.deepEqual(
        Object.keys(seg.flaggedByColumn).sort(),
        [...seg.overSpecColumns].sort(),
      );
    }
  }
  assert.ok(checkedNonEmpty, '樣本應至少有一段有超規格欄位，否則此測項沒驗到東西');
});
