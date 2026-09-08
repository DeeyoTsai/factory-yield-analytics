'use strict';

// 班別窗口推算單元測試，跑：node server/domain/edcShift.test.js
// 涵蓋 Dave 給的三個情境：現在10:00/22:00/04:00 分別該撈哪個窗口。

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDate, deriveShiftDay, computeAutoWindow } = require('./edcShift');

test('computeAutoWindow：現在10:00 → 撈07:00~10:00（日班，同一天）', () => {
  const now = new Date(2026, 7, 3, 10, 15); // 8/3 10:15，驗證會無條件捨去到整點
  const { begin, end } = computeAutoWindow(now);
  assert.equal(formatDate(begin), '2026-08-03');
  assert.equal(begin.getHours(), 7);
  assert.equal(formatDate(end), '2026-08-03');
  assert.equal(end.getHours(), 10);
  assert.deepEqual(deriveShiftDay(begin), { day: '2026-08-03', shift: 'day' });
});

test('computeAutoWindow：現在22:00 → 撈19:00~22:00（夜班，同一天）', () => {
  const now = new Date(2026, 7, 3, 22, 0);
  const { begin, end } = computeAutoWindow(now);
  assert.equal(formatDate(begin), '2026-08-03');
  assert.equal(begin.getHours(), 19);
  assert.equal(end.getHours(), 22);
  assert.deepEqual(deriveShiftDay(begin), { day: '2026-08-03', shift: 'night' });
});

test('computeAutoWindow：現在04:00 → 撈前一天19:00~今天04:00（跨夜的夜班）', () => {
  const now = new Date(2026, 7, 4, 4, 0); // 8/4 04:00
  const { begin, end } = computeAutoWindow(now);
  assert.equal(formatDate(begin), '2026-08-03'); // 前一天
  assert.equal(begin.getHours(), 19);
  assert.equal(formatDate(end), '2026-08-04');
  assert.equal(end.getHours(), 4);
  // 夜班歸屬「開始那天」（8/3），不是資料實際落地的 8/4
  assert.deepEqual(deriveShiftDay(begin), { day: '2026-08-03', shift: 'night' });
});

test('deriveShiftDay：07:00/19:00 邊界與跨夜 00:00~06:59 的歸屬', () => {
  assert.deepEqual(deriveShiftDay(new Date(2026, 7, 3, 7, 0)), { day: '2026-08-03', shift: 'day' });
  assert.deepEqual(deriveShiftDay(new Date(2026, 7, 3, 18, 59)), { day: '2026-08-03', shift: 'day' });
  assert.deepEqual(deriveShiftDay(new Date(2026, 7, 3, 19, 0)), { day: '2026-08-03', shift: 'night' });
  assert.deepEqual(deriveShiftDay(new Date(2026, 7, 3, 6, 59)), { day: '2026-08-02', shift: 'night' });
});

// ── 班別交界觸發（07:00 / 19:00）───────────────────────────────────────────
// 這兩個時間點的「本班起點」剛好等於觸發時刻，直接算會得到零長度窗口 → 跑起來一定
// 「無資料，略過」，導致每班最後 3 小時（日班 16:00~19:00、夜班 04:00~07:00）永遠
// 沒人抓，每天合計漏 6 小時。改成往回撈剛結束那個班別的完整窗口。

test('computeAutoWindow：07:00 觸發往回撈完整夜班（前一天19:00~今天07:00），不是零長度窗口', () => {
  const { begin, end } = computeAutoWindow(new Date(2026, 7, 5, 7, 0, 0));
  assert.notEqual(begin.getTime(), end.getTime(), '不可為零長度窗口');
  assert.equal(begin.getDate(), 4);
  assert.equal(begin.getHours(), 19);
  assert.equal(end.getDate(), 5);
  assert.equal(end.getHours(), 7);
  const { day, shift } = deriveShiftDay(begin);
  assert.equal(shift, 'night', '應寫回剛結束的夜班');
  assert.equal(day, '2026-08-04', '夜班的 day = 夜班開始那天');
});

test('computeAutoWindow：19:00 觸發往回撈完整日班（今天07:00~19:00），不是零長度窗口', () => {
  const { begin, end } = computeAutoWindow(new Date(2026, 7, 5, 19, 0, 0));
  assert.notEqual(begin.getTime(), end.getTime(), '不可為零長度窗口');
  assert.equal(begin.getHours(), 7);
  assert.equal(end.getHours(), 19);
  assert.equal(begin.getDate(), 5);
  const { day, shift } = deriveShiftDay(begin);
  assert.equal(shift, 'day', '應寫回剛結束的日班');
  assert.equal(day, '2026-08-05');
});

test('8 個排程觸發點合起來涵蓋一天 24 小時，沒有任何時段漏抓', () => {
  const covered = new Set();
  for (const h of [7, 10, 13, 16, 19, 22, 1, 4]) {
    const { begin, end } = computeAutoWindow(new Date(2026, 7, 5, h, 0, 0));
    for (let t = begin.getTime(); t < end.getTime(); t += 3600000) covered.add(t);
  }
  // 檢查 8/4 19:00 ~ 8/5 19:00 這完整一輪（夜班+日班）每個小時都被某次觸發涵蓋
  for (let t = new Date(2026, 7, 4, 19).getTime(); t < new Date(2026, 7, 5, 19).getTime(); t += 3600000) {
    assert.ok(covered.has(t), `${new Date(t).toLocaleString()} 這個小時沒有任何排程涵蓋到`);
  }
});
