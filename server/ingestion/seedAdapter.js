/**
 * 內建 ingestion adapter：產生合成的良率 / 機況 / EDC / YOLO 影像假資料，
 * 讓 `npm run seed` 之後每個畫面都有東西看。全部為假資料。
 *
 * 換成自己的資料流：實作一個符合 ingestion/adapter.js 契約的模組，
 * 改 seed/seed.js 裡對本檔的呼叫即可。
 */
const dayjs = require("dayjs");
const db = require("../models");
const { LINES, EDC_STATION_MACHINE_PAIRS } = require("../config/stations");
const { DEFECT_TYPES } = require("../config/defectTypes");
const { makeRng } = require("../seed/rng");
const { generateEdcRows } = require("../seed/edcGen");
const { analyzeEdcData } = require("../domain/edcAnalysis");
const { replaceEdcRecord } = require("../domain/edcStore");
const { replaceUnfinishLot } = require("../domain/unfinishStore");

const {
  RgbTopFive, AllTopFive, GlassInfo, Pdamtable, AdiRecord, ReworkHis,
  OvenSlot, TrendChart, EqAction, UnfinishDefect,
} = db;

const PRODUCTS = ["PNL-A140", "PNL-B156", "PNL-C238"];
const STATIONS_9 = ["BM1", "BM2", "L1", "L2", "L3", "L4", "L5", "L6", "AOI"];
const EQ_STATUS = ["FAC", "INIT", "DOWN", "IDLE", "ENG", "調整", "PM", "MIT", "MFG", "HOLD"];

// 最近 N 個工作日（週末跳過）
function recentWeekdays(n) {
  const out = [];
  let d = dayjs();
  while (out.length < n) {
    if (d.day() !== 0 && d.day() !== 6) out.push(d.format("YYYY-MM-DD"));
    d = d.subtract(1, "day");
  }
  return out.reverse();
}

const pad = (n) => String(n).padStart(2, "0");
function isoWeek(dayStr) {
  const d = new Date(dayStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
const glassId = (day, i) => `GL-${day.replace(/-/g, "").slice(2)}-${pad(i)}`;
const lotNo = (day, i) => `LOT-${day.replace(/-/g, "").slice(2)}${pad(i)}`;

// ── Daily Yield ───────────────────────────────────────────────────────────
async function seedDailyYield(day, seedBase) {
  const rng = makeRng(seedBase);
  let count = 0;

  // AllTopFive / RgbTopFive：當日前五大缺陷
  const defects = rng.shuffle(DEFECT_TYPES).slice(0, 5);
  const allRows = [];
  const rgbRows = [];
  defects.forEach((d, idx) => {
    const line = rng.pick(LINES);
    const qty = rng.int(6, 55) - idx * 3;
    const ratio = Math.round((qty / rng.int(1200, 2600)) * 10000) / 100;
    allRows.push({ stop: line, dfcode: `${line}-${d.label}`, quantity: qty, day, ratio });
    rgbRows.push({ dfcode: `${line}-${d.label}`, quantity: qty, day, ratio, detail_link: "#" });
  });
  await AllTopFive.bulkCreate(allRows);
  const rgbCreated = await RgbTopFive.bulkCreate(rgbRows);
  count += rgbCreated.length;

  // 每個 RgbTopFive 掛一批 glass + 關聯表 + 趨勢圖
  for (const rgb of rgbCreated) {
    const nGlass = rng.int(8, 18);
    const product = rng.pick(PRODUCTS);
    const dfLabel = rgb.dfcode.split("-").slice(1).join("-");

    const pdam = await Pdamtable.create({
      phase: rgb.dfcode[1], product, qty: nGlass, chart1: "NA", chart2: "NA",
      rgbtopfive_id: rgb.id,
    });

    for (let g = 1; g <= nGlass; g += 1) {
      const gid = glassId(day, rng.int(1, 999));
      const firstStop = rng.pick(STATIONS_9);
      const inspect = rng.shuffle(STATIONS_9).slice(0, rng.int(1, 4)).join(",");

      const adi = await AdiRecord.create({
        gid, inrecord: "1".repeat(9),
        bm1: rng.pick(["Y", "N"]), bm2: "N",
        l1: rng.pick(["Y", "N"]), l2: "N", l3: rng.pick(["Y", "N"]),
        l4: "N", l5: "N", l6: "N", aoi: rng.pick(["Y", "N"]),
      }).catch(() => null); // gid unique：同 gid 已存在就略過

      const rework = await ReworkHis.create({
        gid,
        bm1: rng.bool(0.3) ? rng.int(1, 2) : -1, bm2: -1,
        l1: rng.bool(0.3) ? 1 : -1, l2: -1, l3: rng.bool(0.2) ? 1 : -1,
        l4: -1, l5: -1, l6: -1,
      });

      const oven = await OvenSlot.create({
        dt: `${day} ${pad(rng.int(7, 18))}:${pad(rng.int(0, 59))}:00`,
        eqpt_id: `OVN0${rng.int(1, 3)}`, gid, sgrid: `SGR-${rng.int(1000, 9999)}`,
        cst: `CST${rng.int(10, 99)}`, slotno: rng.int(1, 25), cure_pos: rng.int(1, 32),
      });

      await GlassInfo.create({
        gid, xpos: rng.int(0, 1300), ypos: rng.int(0, 1100),
        inspectstops: inspect, dfcode: rgb.dfcode, week: `W${isoWeek(day)}`,
        month: dayjs(day).month() + 1, firststop: firstStop,
        img: `https://picsum.photos/seed/${gid}a/240/180`,
        img2: `https://picsum.photos/seed/${gid}b/240/180`,
        rgbtopfive_id: rgb.id, pdamtable_id: pdam.id,
        ovenslot_id: oven.id, reworkhis_id: rework.id,
        adirecord_id: adi ? adi.id : null,
      });
    }

    // 趨勢圖（可能 1~2 條 line）
    const nTrend = rng.int(1, 2);
    for (let p = 0; p < nTrend; p += 1) {
      const hours = [];
      for (let h = 7; h <= 18; h += 1) hours.push(`${dayjs(day).format("MM/DD")} ${pad(h)}:00`);
      const input = hours.map(() => rng.int(80, 160));
      const output = input.map((v) => v - rng.int(0, 12));
      const defect_qty = hours.map(() => rng.int(0, 9));
      const defect_ratio = defect_qty.map((q, i) => Math.round((q / input[i]) * 10000) / 100);
      await TrendChart.create({
        dfcode: rgb.dfcode, day, process: rng.pick(LINES),
        tool_id: `TOOL-${rng.int(1, 6)}${p + 1}`,
        hours, output, input, defect_qty, defect_ratio,
        total: {
          output: output.reduce((a, b) => a + b, 0),
          input: input.reduce((a, b) => a + b, 0),
          defect_qty: defect_qty.reduce((a, b) => a + b, 0),
          defect_ratio: Math.round((defect_ratio.reduce((a, b) => a + b, 0) / defect_ratio.length) * 100) / 100,
        },
        rgbtopfive_id: rgb.id,
      });
    }
  }
  return count;
}

// ── 機況（EqAction）── Gantt 資料 ─────────────────────────────────────────
async function seedEqActions(days, seedBase) {
  const rng = makeRng(seedBase + 7);
  const rows = [];
  for (const day of days) {
    // 前端「排程與機況履歷」查詢的 startend 窗口＝(選定日-1) 07:00 ~ (選定日+1) 07:00
    const prev = dayjs(day).subtract(1, "day").format("YYYY-MM-DD");
    const next = dayjs(day).add(1, "day").format("YYYY-MM-DD");
    const startend = `${prev} 07:00 - ${next} 07:00`;
    // 事件鋪在「(選定日-1) 07:00 ~ 選定日 07:00」這個生產日，正好落在甘特圖的 x 軸窗口內
    const shiftStart = dayjs(`${prev}T07:00:00`);
    for (const line of LINES) {
      let hour = 0;
      while (hour < 24) {
        const dur = rng.int(1, 5);
        const begin = shiftStart.add(hour, "hour").add(rng.int(0, 40), "minute");
        const end = begin.add(dur, "hour");
        const status = rng.pick(EQ_STATUS);
        rows.push({
          startend,
          line,
          eq: `${line}-EQ${rng.int(1, 4)}`,
          code: `C${rng.int(100, 999)}`,
          status,
          description: `${status} 事件`,
          action: `${status} 處置：${rng.pick(["點檢", "換料", "參數微調", "待料", "重工確認"])}`,
          lot: lotNo(day, rng.int(1, 20)),
          period: dur,
          product: rng.pick(PRODUCTS),
          handler: `E-${rng.int(1000, 1099)}`,
          begintime: begin.format("YYYY/MM/DD HH:mm:ss"),
          endtime: end.format("YYYY/MM/DD HH:mm:ss"),
        });
        hour += dur;
      }
    }
  }
  await EqAction.bulkCreate(rows);
  return rows.length;
}

// ── 未結批 ────────────────────────────────────────────────────────────────
async function seedUnfinish(day, seedBase) {
  const rng = makeRng(seedBase + 13);
  const nLots = rng.int(3, 6);
  let count = 0;
  for (let i = 1; i <= nLots; i += 1) {
    const lotno = lotNo(day, 40 + i);
    const input = rng.int(400, 900);
    const ok = Math.floor(input * rng.float(0.9, 0.99));
    const stageLines = rng.shuffle(LINES).slice(0, rng.int(1, 3));
    const lotRow = {
      lotno,
      stage: stageLines.join("->"),
      o_qty: input - ok, ok_qty: ok, dl1: rng.int(0, 8), dl2: rng.int(0, 4), dl3: rng.int(0, 2),
      multi_dl: rng.int(0, 3), ng: rng.int(0, 5), ls: rng.int(0, 2),
      total: input, input_qty: input,
      yield_rate: Math.round((ok / input) * 10000) / 100,
      recovery_rate: Math.round(rng.float(97, 99.8) * 100) / 100,
      product: rng.pick(PRODUCTS), input_date: day,
    };
    const defects = rng.shuffle(DEFECT_TYPES).slice(0, rng.int(2, 5)).map((d, idx) => ({
      process: rng.pick(LINES),
      defectcode: `${d.code}`,
      qty: rng.int(3, 30) - idx * 2,
      detail_code: idx < 3 ? `DTL${rng.int(10, 99)}` : null,
      product: lotRow.product,
    }));
    const detailsByCode = {};
    for (const d of defects.filter((x) => x.detail_code)) {
      detailsByCode[d.detail_code] = Array.from({ length: rng.int(3, 10) }, (_, k) => ({
        glassid: glassId(day, rng.int(1, 999)),
        p_no: String(rng.int(1, 6)),
        defect_name: d.defectcode,
        x: String(rng.int(0, 1300)), y: String(rng.int(0, 1100)),
        defect_group: `G${rng.int(1, 4)}`,
        product: lotRow.product,
        tedt: `${dayjs(day).format("YYYY/MM/DD")} ${pad(rng.int(8, 18))}:${pad(rng.int(0, 59))}`,
        img_url_1: `https://picsum.photos/seed/unf${d.detail_code}${k}a/240/180`,
        img_url_2: `https://picsum.photos/seed/unf${d.detail_code}${k}b/240/180`,
        inspectstops: rng.shuffle(STATIONS_9).slice(0, 3).join(","),
        firststop: rng.pick(STATIONS_9),
      }));
    }
    const { defectIdByCode } = await replaceUnfinishLot({ lotRow, day, defects, detailsByCode });

    // 給有明細的 defect 掛一張趨勢圖
    for (const code of Object.keys(defectIdByCode)) {
      const hours = [];
      for (let h = 7; h <= 18; h += 1) hours.push(`${dayjs(day).format("MM/DD")} ${pad(h)}:00`);
      const input2 = hours.map(() => rng.int(60, 140));
      const output2 = input2.map((v) => v - rng.int(0, 10));
      const dq = hours.map(() => rng.int(0, 7));
      const dr = dq.map((q, k) => Math.round((q / input2[k]) * 10000) / 100);
      await TrendChart.create({
        dfcode: code, day, process: rng.pick(LINES), tool_id: `TOOL-${rng.int(1, 6)}`,
        hours, output: output2, input: input2, defect_qty: dq, defect_ratio: dr,
        total: {
          output: output2.reduce((a, b) => a + b, 0), input: input2.reduce((a, b) => a + b, 0),
          defect_qty: dq.reduce((a, b) => a + b, 0),
          defect_ratio: Math.round((dr.reduce((a, b) => a + b, 0) / dr.length) * 100) / 100,
        },
        unfinish_defect_id: defectIdByCode[code],
      });
    }
    count += 1;
  }
  return count;
}

// ── EDC 全距監控 ─────────────────────────────────────────────────────────
async function seedEdc(days, seedBase) {
  let count = 0;
  for (const day of days.slice(-2)) { // 只灌最近 2 天，量大
    for (let p = 0; p < EDC_STATION_MACHINE_PAIRS.length; p += 1) {
      const [station, machine] = EDC_STATION_MACHINE_PAIRS[p];
      const rows = generateEdcRows({
        station, machine, day,
        count: 300,
        seed: seedBase + p * 100 + Number(day.replace(/-/g, "").slice(4)),
        overSpec: p % 3 === 0,
      });
      const segments = analyzeEdcData(rows);
      if (!segments.length) continue;
      await replaceEdcRecord({
        day, shift: "day", station, machine, segments,
        windowStart: new Date(`${day}T07:00:00`),
        windowEnd: new Date(`${day}T19:00:00`),
      });
      count += 1;
    }
  }
  return count;
}

// ── YOLO 影像表（FMA 預填 demo）───────────────────────────────────────────
async function seedImages(day, seedBase, gids) {
  const rng = makeRng(seedBase + 21);
  const { imagetbs } = db;
  const rows = [];
  for (const gid of gids) {
    const line = rng.pick(LINES);
    const nDet = rng.int(1, 3);
    const detections = Array.from({ length: nDet }, () => {
      const d = rng.pick(DEFECT_TYPES);
      return {
        class: d.yolo,
        confidence: Math.round(rng.float(0.55, 0.98) * 100) / 100,
        bbox: [rng.int(0, 200), rng.int(0, 200), rng.int(20, 80), rng.int(20, 80)],
      };
    });
    rows.push({
      line, gid, lot: lotNo(day, rng.int(1, 20)),
      datetime: `${day} ${pad(rng.int(8, 18))}:${pad(rng.int(0, 59))}:00`,
      xpos: String(rng.int(0, 1300)), ypos: String(rng.int(0, 1100)),
      ori_img_path: `https://picsum.photos/seed/${gid}ori/320/240`,
      pred_img_path: `https://picsum.photos/seed/${gid}pred/320/240`,
      txt_path: "",
      pred_result: JSON.stringify({ detections }),
      manual_result: rng.bool(0.15) ? rng.pick(DEFECT_TYPES).label : null,
      check_flag: rng.bool(0.6),
      show_flag: true,
      show_pos: rng.int(0, 5),
      emp: null,
    });
  }
  await imagetbs.bulkCreate(rows);
  return rows.length;
}

/**
 * @type {import('./adapter').IngestionAdapter['run']}
 */
async function run(opts = {}) {
  const days = recentWeekdays(15);
  const result = { dailyYield: 0, unfinishLots: 0, edcRecords: 0, eqActions: 0, images: 0 };

  for (let i = 0; i < days.length; i += 1) {
    result.dailyYield += await seedDailyYield(days[i], 1000 + i);
    result.unfinishLots += await seedUnfinish(days[i], 2000 + i);
  }
  result.eqActions = await seedEqActions(days, 3000);
  result.edcRecords = await seedEdc(days, 4000);

  // FMA glass id（seed.js 建完 FMA 之後把 gid 傳進來灌影像；這裡自產一批也行）
  if (Array.isArray(opts.fmaGids) && opts.fmaGids.length) {
    result.images = await seedImages(days[days.length - 1], 5000, opts.fmaGids);
  }
  return result;
}

module.exports = { run, seedImages };
