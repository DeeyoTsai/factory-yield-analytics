/**
 * npm run seed —— 建表 + 灌一份合成 demo 資料，讓每個畫面都有東西看。
 *
 * ⚠️ 會 DROP 並重建所有資料表（含使用者）。這是 demo 用的重置指令，
 *    接了自己的資料流之後不要再跑（或改成只 truncate demo 表）。
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../models");
const { LINES } = require("../config/stations");
const { DEFECT_TYPES, DEFECT_KEYS } = require("../config/defectTypes");
const { makeRng } = require("./rng");
const seedAdapter = require("../ingestion/seedAdapter");

const { users: User, outlines: Outlines, fmatbs: Fmatbs } = db;

const PRODUCTS = ["PNL-A140", "PNL-B156", "PNL-C238"];
const pad = (n) => String(n).padStart(2, "0");

const DEMO_USERS = [
  { employee: "E-1001", username: "demo-operator", email: "operator@example.com", department: "ENG", level: "normal", password: "demo1234" },
  { employee: "E-1040", username: "demo-manager", email: "manager@example.com", department: "MFG", level: "normal", password: "demo1234" },
  { employee: "E-1090MGR", username: "demo-admin", email: "admin@example.com", department: "MGT", level: "admin", password: "demo1234" },
];

function recentWeekdays(n) {
  const out = [];
  const d = new Date();
  while (out.length < n) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) {
      out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
    d.setDate(d.getDate() - 1);
  }
  return out.reverse();
}

async function seedUsers() {
  for (const u of DEMO_USERS) await User.create(u); // beforeSave hook 會 hash 密碼
  console.log(`  使用者 x${DEMO_USERS.length}（密碼一律 demo1234）`);
}

async function seedFma() {
  const rng = makeRng(777);
  const days = recentWeekdays(10);
  const gids = [];
  let outlineCount = 0;
  let glassCount = 0;

  for (let i = 0; i < 16; i += 1) {
    const day = rng.pick(days);
    const line = rng.pick(LINES);
    const product = rng.pick(PRODUCTS);
    const top3 = rng.shuffle(DEFECT_TYPES).slice(0, 3)
      .map((d) => `${d.label}-${rng.int(10, 60)}`);

    const outline = await Outlines.create({
      emp: rng.pick(DEMO_USERS).employee,
      line, product,
      lot: `LOT-${day.replace(/-/g, "").slice(2)}${pad(rng.int(1, 20))}`,
      first: top3[0], second: top3[1], third: top3[2],
      datetime: new Date(`${day}T${pad(rng.int(7, 20))}:${pad(rng.int(0, 59))}:00`),
      comment: rng.pick([
        "首件檢查，主要缺陷集中於上緣",
        "整體良好，破損為搬運碰撞",
        "顯影不良集中在同一 CST，隔離待重工",
        "殘膠偏多，去膠槽液更新排程提前",
        "氣泡比例上升，貼合段真空度待確認",
      ]),
      drag_slots: null,
    });
    outlineCount += 1;

    const nGlass = rng.int(3, 8);
    const rows = [];
    for (let g = 0; g < nGlass; g += 1) {
      const gid = `GL-${day.replace(/-/g, "").slice(2)}-${pad(rng.int(1, 999))}`;
      gids.push(gid);
      const row = { date: day, gid, outlineId: outline.id, s: rng.int(0, 6), m: rng.int(0, 4), l: rng.int(0, 2), otherdf: "[]" };
      for (const key of DEFECT_KEYS) row[key] = rng.bool(0.35) ? rng.int(1, 6) : 0;
      rows.push(row);
    }
    await Fmatbs.bulkCreate(rows);
    glassCount += rows.length;
  }
  console.log(`  FMA outline x${outlineCount}、glass x${glassCount}`);
  return gids;
}

async function main() {
  console.log("→ 建立資料表（DROP 後重建）...");
  await db.sequelize.sync({ force: true });

  console.log("→ 灌 demo 資料...");
  await seedUsers();
  const fmaGids = await seedFma();

  const r = await seedAdapter.run({ fmaGids });
  console.log(
    `  Daily Yield x${r.dailyYield}、未結批 lot x${r.unfinishLots}、` +
    `EDC record x${r.edcRecords}、機況 x${r.eqActions}、YOLO 影像 x${r.images}`
  );

  console.log("\n✅ seed 完成。啟動：server `npm run dev`、client `npm start`");
  console.log("   登入：E-1001 / E-1040 / E-1090MGR，密碼 demo1234");
  await db.sequelize.close();
}

main().catch((e) => {
  console.error("seed 失敗：", e);
  process.exit(1);
});
