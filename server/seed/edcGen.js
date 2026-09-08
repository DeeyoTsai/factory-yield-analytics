// 產生單一站別一天的 EDC 曝光對位量測列（供 seedAdapter 用）。
// 形狀與 domain/edcAnalysis.analyzeEdcData() 的輸入一致。
const { makeRng } = require("./rng");

const CORNERS = ["FRX", "FRY", "FLX", "FLY", "RLX", "RLY", "RRX", "RRY"];

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * @param {{ station:string, machine:string, day:string, recipe?:string,
 *           count?:number, seed?:number, overSpec?:boolean }} opts
 * @returns {Array<object>} rows（event_datetime 為 Date）
 */
function generateEdcRows({
  station,
  machine,
  day,
  recipe = "RCP-A",
  count = 320,
  seed = 1,
  overSpec = false,
}) {
  const rng = makeRng(seed);
  const start = new Date(`${day}T07:05:00`).getTime();

  const base = {};
  for (let s = 1; s <= 4; s += 1) {
    for (const c of CORNERS) {
      base[`Shot${s}_Final_${c}`] = 3.0 + s * 0.12 + (c.endsWith("Y") ? 0.15 : 0);
    }
  }

  // relogin：在中段插一個大間隔 + 位移
  const reloginAt = Math.floor(count * 0.4);
  const shift = -1.05;

  const rows = [];
  let t = start;
  for (let i = 0; i < count; i += 1) {
    if (i > 0) {
      let gapSec = 48 + rng.float(-6, 8);
      if (i === reloginAt) gapSec = 8 * 60;
      else if (i === Math.floor(count * 0.7)) gapSec = 6.5 * 60; // idle（不切）
      t += gapSec * 1000;
    }
    const rel = i >= reloginAt ? shift : 0;
    const row = {
      glass_id: `GL-${day.replace(/-/g, "").slice(2)}-${String(i + 1).padStart(3, "0")}`,
      lot_id: `LOT-${day.replace(/-/g, "").slice(2)}${String(Math.floor(i / 90) + 1).padStart(2, "0")}`,
      event_datetime: new Date(t),
      recipe,
      process_complete: "1111",
    };
    for (let s = 1; s <= 4; s += 1) {
      for (const c of CORNERS) {
        row[`Shot${s}_Final_${c}`] = round3(base[`Shot${s}_Final_${c}`] + rel + rng.float(-0.35, 0.35));
      }
      row[`Shot${s}_Expose`] = round3(63 + rng.float(-0.3, 0.3));
    }
    for (let s = 5; s <= 6; s += 1) {
      for (const c of CORNERS) row[`Shot${s}_Final_${c}`] = 0;
      row[`Shot${s}_Expose`] = 0;
    }
    rows.push(row);
  }

  if (overSpec) {
    // 讓 relogin 之後某欄全距 >= 4
    const victim = "Shot2_Final_FRY";
    rows[reloginAt + 10][victim] = round3(base[victim] + shift + 4.4);
    rows[Math.floor(count * 0.85)][victim] = round3(base[victim] + shift + 3.8);
  }
  return rows;
}

module.exports = { generateEdcRows, CORNERS };
