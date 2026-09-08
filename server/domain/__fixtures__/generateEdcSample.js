'use strict';

/**
 * 產生一份合成的 EDC 曝光對位量測樣本（供 edcAnalysis.test.js 與 seed 用）。
 * 全部假資料，刻意鋪出可驗證的結構：
 *   - 單一 recipe（RCP-A）整段 → 只會有 relogin 軟邊界，沒有品種硬邊界
 *   - index 77 附近：8 分鐘間隔 + 所有監控欄位中位數位移 -1.1 → 應偵測為 relogin 段界
 *   - index 127 / 213 / 510：6~8 分鐘間隔但無位移 → idle 待機，不應切段
 *   - Shot1~4 有值、Shot5~6 整欄恆為 0（模擬未曝光的 shot）
 *   - 第二段的 Shot2_Final_FRY 塞 2 枚離群值，使該欄全距 >= 4（超規格）
 *
 *   node server/domain/__fixtures__/generateEdcSample.js   # 重新產生 edcSample.json
 */

const fs = require('fs');
const path = require('path');

const CORNERS = ['FRX', 'FRY', 'FLX', 'FLY', 'RLX', 'RLY', 'RRX', 'RRY'];
const N = 720;
const START = new Date('2026-05-04T07:03:00');
const NOMINAL_GAP_SEC = 50;

// 可重現的偽亂數
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const noise = (amp) => (rand() - 0.5) * 2 * amp;
const round3 = (n) => Math.round(n * 1000) / 1000;

// 每個監控欄位的基準值（relogin 後整體 -1.1）
const BASE = {};
for (let s = 1; s <= 4; s += 1) {
  for (const c of CORNERS) BASE[`Shot${s}_Final_${c}`] = 3.0 + s * 0.15 + (c.endsWith('Y') ? 0.2 : 0);
}

const RELOGIN_AT = 77;
const RELOGIN_SHIFT = -1.1;
const IDLE_GAPS = new Set([127, 213, 510]);

const rows = [];
let t = START.getTime();

for (let i = 0; i < N; i += 1) {
  if (i > 0) {
    let gap = NOMINAL_GAP_SEC + noise(6);
    if (i === RELOGIN_AT) gap = 8.4 * 60;      // relogin：大間隔
    else if (IDLE_GAPS.has(i)) gap = 7 * 60;   // idle：大間隔但無位移
    t += gap * 1000;
  }

  const relogin = i >= RELOGIN_AT ? RELOGIN_SHIFT : 0;
  const row = {
    glass_id: `GL-26050400-${String(i + 1).padStart(3, '0')}`,
    lot_id: `LOT-2605040${Math.floor(i / 120) + 1}`,
    event_datetime: new Date(t).toISOString(),
    recipe: 'RCP-A',
    process_complete: '1111',
  };
  for (let s = 1; s <= 4; s += 1) {
    for (const c of CORNERS) {
      row[`Shot${s}_Final_${c}`] = round3(BASE[`Shot${s}_Final_${c}`] + relogin + noise(0.35));
    }
    row[`Shot${s}_Expose`] = round3(63.2 + noise(0.3));
  }
  // Shot5 / Shot6：整欄恆為 0（未曝光的 shot）
  for (let s = 5; s <= 6; s += 1) {
    for (const c of CORNERS) row[`Shot${s}_Final_${c}`] = 0;
    row[`Shot${s}_Expose`] = 0;
  }
  rows.push(row);
}

// 第二段（relogin 之後）塞離群：把 index 90 與 300 的 Shot2_Final_FRY 拉高，
// 使該欄在其所屬段的全距 >= 4
rows[90].Shot2_Final_FRY = round3(BASE.Shot2_Final_FRY + RELOGIN_SHIFT + 4.3);
rows[300].Shot2_Final_FRY = round3(BASE.Shot2_Final_FRY + RELOGIN_SHIFT + 3.9);

const outPath = path.join(__dirname, 'edcSample.json');
fs.writeFileSync(outPath, JSON.stringify(rows, null, 0));
console.log(`寫入 ${rows.length} 列 → ${outPath}`);
