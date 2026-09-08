const router = require("express").Router();
const { Op } = require("sequelize");
const db = require("../models");
const {
  requirePermission,
  requireResourceOwner,
  rateLimit,
} = require("../middleware/auth.middleware");
const { DEFECT_KEYS, byKey } = require("../config/defectTypes");

const User = db.users;
const Fmatbs = db.fmatbs;
const Outlines = db.outlines;

// 掛載時已套 passport JWT（見 server/index.js），req.user 由 passport 提供

function isAdmin(level) {
  return level === "admin" || level === "super";
}
function ownsOrAdmin(reqUser, ownerEmp) {
  return isAdmin(reqUser.level) || ownerEmp === reqUser.employee;
}

// ── Outline（FMA 表單的父層紀錄）───────────────────────────────────────────

// 新增一筆 outline
router.post(
  "/fmaOutline",
  requirePermission("fma-table", "write"),
  requireResourceOwner("emp"),
  async (req, res) => {
    const { outlineData } = req.body;
    try {
      const employee = outlineData.emp;
      const user = await User.findOne({ where: { employee } });
      if (!user) return res.status(401).send("找不到此工號的使用者，請先註冊帳號");

      const savedFmaOutline = await Outlines.create({
        emp: outlineData.emp,
        line: outlineData.line,
        product: outlineData.product,
        lot: outlineData.lot,
        first: outlineData.first,
        second: outlineData.second,
        third: outlineData.third,
        datetime: new Date(outlineData.datetime).toLocaleString("sv"),
        comment: outlineData.comment,
        drag_slots: outlineData.drag_slots ?? null,
      });
      return res.send({ msg: "Outline data儲存成功", savedFmaOutline });
    } catch (e) {
      return res.status(500).send({ msg: "Outline資料格式錯誤，無法新增至資料庫" });
    }
  }
);

// 刪除一筆 outline（連動 fmatbs cascade）
router.delete("/fmaOutlineRow/:id", async (req, res) => {
  try {
    const found = await Outlines.findByPk(req.params.id);
    if (!found) return res.status(404).send({ msg: `資料庫內找不到 id=${req.params.id} 的資料` });
    if (!ownsOrAdmin(req.user, found.emp)) {
      return res.status(403).send({ msg: "您只能刪除自己填寫的資料" });
    }
    await found.destroy();
    return res.send({ msg: `資料 id=${req.params.id} 刪除成功!` });
  } catch (e) {
    return res.status(500).send({ msg: "資料錯誤，無法刪除" });
  }
});

// 更新一筆 outline
router.put("/fmaOutlineRow/:outlineId", async (req, res) => {
  const { newOutlineRow } = req.body;
  try {
    const outline = await Outlines.findByPk(req.params.outlineId);
    if (!outline) return res.status(404).send({ msg: "找不到指定的 outline" });
    if (!ownsOrAdmin(req.user, outline.emp)) {
      return res.status(403).send({ msg: "只有自己或 admin 可以修改資料" });
    }
    const updateOutline = await Outlines.update(newOutlineRow, {
      where: { id: req.params.outlineId },
    });
    return res.send({ msg: "Outline資料更新成功", updateOutline });
  } catch (error) {
    return res.status(500).send({ msg: "更新Outline資料發生錯誤", error: error.message });
  }
});

// ── Glass 量測（FMA 表單的子層，一片 glass 一列）──────────────────────────

// 批次新增
router.post("/glassDataSet", requirePermission("fma-table", "write"), async (req, res) => {
  const { employee, sheetDataSet } = req.body;
  try {
    const user = await User.findOne({ where: { employee } });
    if (!user) return res.status(401).send("找不到此工號的使用者，請先註冊帳號");
    const savedGlasses = await Fmatbs.bulkCreate(sheetDataSet);
    return res.send({ msg: "資料儲存成功!", savedGlasses });
  } catch (e) {
    return res.status(500).send({ msg: "GlassDataSet資料格式錯誤，無法新增至資料庫" });
  }
});

// 依 outlineId 查該批 glass
router.get("/glassDataSet/:id", requirePermission("fma-table", "read"), async (req, res) => {
  try {
    const foundData = await Fmatbs.findAll({
      where: { outlineId: req.params.id },
      include: [{ model: Outlines, attributes: ["emp", "line", "product", "datetime"], required: true }],
    });
    return res.send({
      msg: `成功取得 outlineId=${req.params.id} 的資料`,
      foundData,
      currentUser: { employee: req.user.employee, level: req.user.level },
    });
  } catch (error) {
    return res.status(400).send({ msg: `查無 outlineId=${req.params.id} 的資料` });
  }
});

// 批次更新該批 glass
router.put("/glassDataSet/:outlineId", requirePermission("fma-table", "write"), async (req, res) => {
  const { outlineId } = req.params;
  const { glassDataSet } = req.body;
  try {
    const outline = await Outlines.findByPk(outlineId);
    if (!outline) return res.status(404).send({ msg: "找不到指定的 outline" });
    if (!ownsOrAdmin(req.user, outline.emp)) {
      return res.status(403).send({ msg: "只有自己或 admin 可以修改資料" });
    }
    await Promise.all(
      glassDataSet.map((glass) => {
        const { sqlId, ...rest } = glass;
        return Fmatbs.update(rest, { where: { id: sqlId, outlineId } });
      })
    );
    return res.send({ msg: "FMA資料更新成功", updatedCount: glassDataSet.length });
  } catch (error) {
    return res.status(500).send({ msg: "更新FMA資料時發生錯誤", error: error.message });
  }
});

// ── Dashboard 統計 ────────────────────────────────────────────────────────

// 缺陷欄位在統計輸出裡沿用 "x-yyy" 破折號鍵（前端 DashboardContext 的對照鍵），
// 這裡由 defectTypes.js 的 key 產生對照（scratch -> scratch，filmthickness -> film-thickness…）。
const DASH_DEFECT_KEYS = DEFECT_KEYS; // 直接用 key，前端也讀同一份 defectTypes

router.get(
  "/statistics/:startDate/:endDate",
  requirePermission("dashboard", "read"),
  rateLimit(50, 60000),
  async (req, res) => {
    try {
      const sdate = new Date(req.params.startDate).toISOString().split("T")[0];
      const edate = new Date(req.params.endDate).toISOString().split("T")[0];

      const outlineData = await Outlines.findAll({
        order: [["datetime", "DESC"]],
        where: {
          datetime: {
            [Op.between]: [new Date(sdate + " 00:00:00"), new Date(edate + " 23:59:59")],
          },
        },
        include: [{ model: Fmatbs, required: false }],
      });

      const stats = {
        totalOutlines: outlineData.length,
        totalGlasses: 0,
        defectKeys: DASH_DEFECT_KEYS,
        defectLabels: Object.fromEntries(DASH_DEFECT_KEYS.map((k) => [k, byKey[k].label])),
        defectSummary: {}, // { [key]: total }
        defectsByLine: {}, // { [line]: { [key]: count } }
        stackedBarData: {}, // { [key]: { [line]: count } }
        productionByLine: {},
        dailyProduction: {},
        addDefects: [], // otherdf 裡出現的非標準缺陷名
      };

      for (const outline of outlineData) {
        const line = outline.line || "unknown";
        stats.productionByLine[line] = (stats.productionByLine[line] || 0) + 1;

        const day = new Date(outline.datetime).toISOString().split("T")[0];
        stats.dailyProduction[day] = (stats.dailyProduction[day] || 0) + 1;

        if (!stats.defectsByLine[line]) stats.defectsByLine[line] = {};

        for (const glass of outline.fmatbs || []) {
          stats.totalGlasses += 1;

          for (const key of DASH_DEFECT_KEYS) {
            const n = glass[key];
            if (!n) continue;
            stats.defectSummary[key] = (stats.defectSummary[key] || 0) + n;
            stats.defectsByLine[line][key] = (stats.defectsByLine[line][key] || 0) + n;
            if (!stats.stackedBarData[key]) stats.stackedBarData[key] = {};
            stats.stackedBarData[key][line] = (stats.stackedBarData[key][line] || 0) + n;
          }

          // otherdf：自由格式的其他缺陷 [{ name: count }, ...]
          for (const obj of glass.otherdf || []) {
            for (const [name, n] of Object.entries(obj)) {
              if (!n) continue;
              if (!stats.addDefects.includes(name)) stats.addDefects.push(name);
              stats.defectSummary[name] = (stats.defectSummary[name] || 0) + n;
              if (!stats.stackedBarData[name]) stats.stackedBarData[name] = {};
              stats.stackedBarData[name][line] = (stats.stackedBarData[name][line] || 0) + n;
            }
          }
        }
      }

      return res.send({ msg: "統計數據獲取成功", statistics: stats, rawData: outlineData });
    } catch (error) {
      return res.status(500).send({ msg: "獲取統計數據失敗", error: error.message });
    }
  }
);

// ── 查詢 outlines（by 工號 / lot / line / product / 日期範圍）────────────────
// path: /:emp_lot_line_product_sdate_edate（空欄位傳空字串）
router.get("/:queryparams", requirePermission("fma-table", "read"), async (req, res) => {
  const [emp, lot, line, product, sdate, edate] = req.params.queryparams.split("_");

  const eq = {};
  if (emp) eq.emp = emp;
  if (lot) eq.lot = lot;
  if (line) eq.line = line;
  if (product) eq.product = product;

  const range = {};
  if (sdate) range[Op.gte] = new Date(sdate + " 00:00:00");
  if (edate) range[Op.lte] = new Date(edate + " 23:59:59");

  try {
    const where = { ...eq };
    if (Object.keys(range).length) where.datetime = range;

    const foundData = await Outlines.findAll({
      where,
      include: [{ model: User, attributes: ["employee", "username", "level"], required: false }],
    });
    return res.send({
      msg: `成功取得工號:${emp || "(全部)"} 的 FMA 資料`,
      foundData,
      currentUser: { employee: req.user.employee, level: req.user.level },
    });
  } catch (e) {
    return res.status(500).send({ msg: e.message });
  }
});

module.exports = router;
