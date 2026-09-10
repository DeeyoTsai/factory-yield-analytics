'use strict';

// 離群偵測（全距>=4 抓兇手基板）判斷邏輯的單元測試。
// 用手算可驗證的合成資料把各分支全部釘死，跑：node server/domain/edcOutlier.test.js
//
// 判斷順序（中位數為中心，h1=max−median、h2=median−min、閥值 T=outlierThreshold、
// 接近比例 closenessRatio）：
//   (1) 產生候選端：① |h1-h2| < closenessRatio*全距（差距太接近，分不出兇手）→ max/min 兩端都列候選；
//       ② 否則選贏家（h1、h2 較大的一端），贏家 > T → 只列贏家，否則兩端都列候選
//   (2) 候選端過「管制線」：只有該端 h > T（確實超出中位數±T）才真的標記；管制線內的極值剔除
//   (3) 保底：(2) 後全空 → 退回標 h 較大那一端一枚（tie 取 max），維持「超規格欄位必有兇手」

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeEdcData } = require('./edcAnalysis');

const COL = 'Shot1_Final_FLX';

// 把一串數值轉成同品種、間隔 60s（不會觸發 relogin）、單一監控欄位的 rows
function buildRows(values) {
  const base = new Date('2026-07-08T08:00:00');
  return values.map((v, i) => ({
    glass_id: `G${i}`,
    event_datetime: new Date(base.getTime() + i * 60000),
    recipe: 'RECIPE_A',
    [COL]: v,
  }));
}

// 只有一段時，取該段該欄位的離群結果
function flaggedOf(values) {
  const segs = analyzeEdcData(buildRows(values));
  assert.equal(segs.length, 1, `合成資料應只有一段，實際=${segs.length}`);
  return { seg: segs[0], info: segs[0].flaggedByColumn[COL], stat: segs[0].stats[COL] };
}

test('分支①：max 遠離、min 正常，差距夠大 → 只取 max 那枚', () => {
  // [10×9, 16] → median=10, min=10, max=16, 全距=6, h1=6, h2=0，diff=6 >= 0.3*6=1.8 → 不接近
  const { info, stat } = flaggedOf([10, 10, 10, 10, 10, 10, 10, 10, 10, 16]);
  assert.equal(stat.range, 6);
  assert.equal(info.flagged.length, 1);
  assert.equal(info.flagged[0].side, 'max');
  assert.equal(info.flagged[0].value, 16);
});

test('分支②：min 遠離、max 正常，差距夠大 → 只取 min 那枚', () => {
  // [4, 10×9] → median=10, min=4, max=10, 全距=6, h1=0, h2=6，diff=6 >= 0.3*6=1.8 → 不接近
  const { info, stat } = flaggedOf([4, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  assert.equal(stat.range, 6);
  assert.equal(info.flagged.length, 1);
  assert.equal(info.flagged[0].side, 'min');
  assert.equal(info.flagged[0].value, 4);
});

test('closeness + 保底：兩端對稱且都剛好貼在管制線上（h1=h2=T）→ 過濾後全空 → 保底標較遠端一枚（tie 取 max）', () => {
  // [8, 10×8, 12] → median=10, min=8, max=12, 全距=4, h1=2, h2=2，diff=0 < 0.3*4=1.2 → closeness
  //   候選=[max,min]；過管制線：h1=2 not>2、h2=2 not>2 → 全被剔除；保底：h1>=h2 → 取 max 一枚
  //   （改版前是「兩端都標」，會讓貼著管制線的 min 也被標紅，故收斂成保底一枚）
  const { info, stat } = flaggedOf([8, 10, 10, 10, 10, 10, 10, 10, 10, 12]);
  assert.equal(stat.range, 4);
  assert.equal(info.flagged.length, 1);
  assert.equal(info.flagged[0].side, 'max');
  assert.equal(info.flagged[0].value, 12);
});

test('closeness + 部分過濾：只有一端超過 T → 只標那一端（另一端在管制線內被剔除）', () => {
  // [11, 13×8, 16] → median=13, min=11, max=16, 全距=5, h1=3, h2=2，diff=1 < 0.3*5=1.5 → closeness
  //   候選=[max,min]；過管制線：h1=3>2 保留 max、h2=2 not>2 剔除 min → 只剩 max
  const { info, stat } = flaggedOf([11, 13, 13, 13, 13, 13, 13, 13, 13, 16]);
  assert.equal(stat.range, 5);
  assert.equal(info.flagged.length, 1);
  assert.equal(info.flagged[0].side, 'max');
  assert.equal(info.flagged[0].value, 16);
});

test('分支①/②的邊界情境：h1/h2 差距不算 0，但仍在 closenessRatio 範圍內，且兩端都超過 T → 兩端都取', () => {
  // [10, 14×8, 17] → median=14, min=10, max=17, 全距=7, h1=3, h2=4，diff=1 < 0.3*7=2.1 → 太接近
  // h1=3>T=2、h2=4>T=2 兩端「各自看都超標」，但差距不夠大分不出誰是主兇手，故仍兩端都標
  const { info, stat } = flaggedOf([10, 14, 14, 14, 14, 14, 14, 14, 14, 17]);
  assert.equal(stat.range, 7);
  assert.equal(info.flagged.length, 2);
  const sides = info.flagged.map((f) => f.side).sort();
  assert.deepEqual(sides, ['max', 'min']);
});

test('分支②贏家不顯著 + 保底（自訂 rangeSpec=3）：候選兩端都沒超過 T → 全被剔除 → 保底標 h 較大端一枚', () => {
  // 預設 rangeSpec=4 剛好等於 2*T，有明顯差距時贏家必然 > T；換成 rangeSpec=3 才走得到
  // 「贏家 <= T」這條路徑。
  // [9, 10×8, 12] → median=10, min=9, max=12, 全距=3, h1=2, h2=1，diff=1 >= 0.3*3=0.9 → 不接近
  //   分支②贏家 h1=2 未 > T=2 → 候選=[max,min]；過管制線：h1=2 not>2、h2=1 not>2 → 全空；
  //   保底：h1(2) >= h2(1) → 取 max 一枚（改版前是「兩端都取」，min=9 貼著中位數也被標紅）
  const rows = buildRows([9, 10, 10, 10, 10, 10, 10, 10, 10, 12]);
  const segs = analyzeEdcData(rows, { rangeSpec: 3 });
  assert.equal(segs.length, 1);
  const info = segs[0].flaggedByColumn[COL];
  const stat = segs[0].stats[COL];
  assert.equal(stat.range, 3);
  assert.ok(info, '全距=3 且自訂 rangeSpec=3 應該被標記');
  assert.equal(info.flagged.length, 1);
  assert.equal(info.flagged[0].side, 'max');
  assert.equal(info.flagged[0].value, 12);
});

test('門檻：全距 < rangeSpec(4) → 完全不標記', () => {
  // [9, 10×8, 11] → 全距=2 < 4 → 不 flag
  const segs = analyzeEdcData(buildRows([9, 10, 10, 10, 10, 10, 10, 10, 10, 11]));
  assert.equal(segs.length, 1);
  assert.equal(segs[0].flaggedByColumn[COL], undefined);
  assert.equal(segs[0].overSpec, false);
});

test('門檻邊界：全距 = 4（剛好等於 rangeSpec）→ 要標記（>= 非 >）', () => {
  const { info, stat } = flaggedOf([8, 10, 10, 10, 10, 10, 10, 10, 10, 12]);
  assert.equal(stat.range, 4);
  assert.ok(info, '全距=4 應該被標記');
});

test('不變量：任何被抓的 glass，其值必為該欄位的 max(side=max) 或 min(side=min)', () => {
  // 用合成樣本掃全部標記結果，驗證極值一致性
  const rows = require('./__fixtures__/edcSample.json').map((r) => ({ ...r, event_datetime: new Date(r.event_datetime) }));
  const segs = analyzeEdcData(rows);
  let checked = 0;
  for (const seg of segs) {
    for (const [col, info] of Object.entries(seg.flaggedByColumn)) {
      const { min, max } = seg.stats[col];
      for (const f of info.flagged) {
        if (f.side === 'max') assert.equal(f.value, max, `${col} side=max 的值應等於 max`);
        if (f.side === 'min') assert.equal(f.value, min, `${col} side=min 的值應等於 min`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0, '樣本應至少有一筆被標記可驗證');
});
