'use strict';

// 班別/查詢窗口推算工具（純函式，無 IO）。班別以 07:00/19:00 為界：日班 07:00~18:59、夜班 19:00~06:59(次日)。
// 供「排程型」ingestion adapter 用：排程模式（auto）算這次該撈哪個班別窗口，以及任一時間點該歸屬哪個 (day, shift)。

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// 依時間點判斷所屬 (day, shift)。夜班（19:00~06:59）一律歸屬「夜班開始那天」，
// 所以 00:00~06:59 要往前推一天。
function deriveShiftDay(dt) {
  const hour = dt.getHours();
  if (hour >= 7 && hour < 19) {
    return { day: formatDate(dt), shift: 'day' };
  }
  if (hour >= 19) {
    return { day: formatDate(dt), shift: 'night' };
  }
  const prevDay = new Date(dt);
  prevDay.setDate(prevDay.getDate() - 1);
  return { day: formatDate(prevDay), shift: 'night' };
}

// 排程模式（auto）：依目前時間算出這次該撈的班別窗口 [begin, end]。
// end＝目前時間無條件捨去到整點（排程理論上準點觸發，捨去是防時鐘誤差）；
// begin＝最近一個班別邊界（07:00 或 19:00），00:00~06:59 觸發時 begin 要跨到前一天 19:00。
//
// ⚠️ 班別交界觸發（07:00 / 19:00）的特別處理：這兩個時間點算出來的 begin 會等於 end
// （本班才剛開始、還沒有任何資料），零長度窗口跑起來一定是「無資料，略過」。若不處理，
// 每班的最後 3 小時就永遠沒人抓——日班最後一次有效抓取是 16:00（涵蓋 07:00~16:00），
// 16:00~19:00 全漏；夜班最後一次是 04:00（涵蓋 19:00~04:00），04:00~07:00 全漏，
// 每天合計漏掉 6 小時。所以交界觸發改成往回撈「剛結束的那個班別的完整窗口」：
//   07:00 觸發 → 前一天 19:00 ~ 今天 07:00（夜班收尾，寫入 (前一天, night)）
//   19:00 觸發 → 今天 07:00 ~ 今天 19:00（日班收尾，寫入 (今天, day)）
// 寫入的 (day, shift) 由 deriveShiftDay(begin) 決定，所以會正確落回剛結束那個班別。
function computeAutoWindow(now = new Date()) {
  const end = new Date(now);
  end.setMinutes(0, 0, 0);

  const begin = new Date(end);
  const hour = end.getHours();
  if (hour >= 7 && hour < 19) {
    begin.setHours(7, 0, 0, 0);
  } else if (hour >= 19) {
    begin.setHours(19, 0, 0, 0);
  } else {
    begin.setDate(begin.getDate() - 1);
    begin.setHours(19, 0, 0, 0);
  }

  if (begin.getTime() === end.getTime()) {
    if (hour === 7) {
      // 日班起點＝夜班終點，往回撈整個夜班
      begin.setDate(begin.getDate() - 1);
      begin.setHours(19, 0, 0, 0);
    } else {
      // hour === 19：夜班起點＝日班終點，往回撈整個日班
      begin.setHours(7, 0, 0, 0);
    }
  }
  return { begin, end };
}

module.exports = { formatDate, deriveShiftDay, computeAutoWindow };
