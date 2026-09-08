const { UnfinishLot, UnfinishDefect, UnfinishDefectDetail, AdiRecord, ReworkHis, TrendChart } = require('../models');
const { Op } = require('sequelize');
const { fetchEqActionsForTrend } = require('./helpers/trendEqActions');

// GET /api/unfinish-lot/list?day=YYYY-MM-DD
exports.listByDay = async (req, res) => {
  try {
    const { day } = req.query;
    if (!day) return res.status(400).json({ message: 'day is required (YYYY-MM-DD)' });
    const lots = await UnfinishLot.findAll({
      where: { day },
      order: [['lotno', 'ASC']],
      // 帶出 defects（qty/defectcode），供 Lot 清單圖表標出每 lot 的主要 defect code
      include: [{ model: UnfinishDefect, as: 'defects', attributes: ['defectcode', 'qty'] }],
    });
    res.status(200).json({ lots });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/unfinish-lot/:lotId/defects — 含 hasDetails 旗標
exports.getDefects = async (req, res) => {
  try {
    const defects = await UnfinishDefect.findAll({
      where: { unfinishlot_id: req.params.lotId },
      include: [{ model: UnfinishDefectDetail, as: 'details', attributes: ['id'] }],
      order: [['qty', 'DESC']],
    });
    res.status(200).json({
      defects: defects.map((d) => {
        const plain = d.get({ plain: true });
        const hasDetails = plain.details.length > 0;
        delete plain.details;
        return { ...plain, hasDetails };
      }),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/unfinish-lot/defect/:defectId/details — glass 明細 + ADI History + Rework History
exports.getDefectDetails = async (req, res) => {
  try {
    const details = await UnfinishDefectDetail.findAll({
      where: { unfinish_defect_id: req.params.defectId },
      order: [['glassid', 'ASC']],
    });
    const glassIds = [...new Set(details.map((r) => r.glassid))];
    const adiRows = glassIds.length
      ? await AdiRecord.findAll({ where: { gid: { [Op.in]: glassIds } } })
      : [];
    const reworkRows = glassIds.length
      ? await ReworkHis.findAll({ where: { gid: { [Op.in]: glassIds } } })
      : [];
    // 組成 AdiHistoryTable/ReworkHisTable 期望的 {id, gid, adirecord/reworkhis} 形狀（沿用 daily 元件）
    const adiHistory = adiRows.map((r) => ({ id: r.id, gid: r.gid, adirecord: r }));
    const reworkHistory = reworkRows.map((r) => ({ id: r.id, gid: r.gid, reworkhis: r }));
    res.status(200).json({ details, adiHistory, reworkHistory });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/unfinish-lot/defect/:defectId/trend — 與 trendChartController.getByRgbId 同形狀
exports.getDefectTrend = async (req, res) => {
  try {
    const trend = await TrendChart.findOne({ where: { unfinish_defect_id: req.params.defectId } });
    if (!trend) return res.status(404).json({ message: 'TrendChart not found' });
    const eqActions = await fetchEqActionsForTrend(trend);
    res.status(200).json({
      trend: {
        dfcode: trend.dfcode, day: trend.day, process: trend.process, tool_id: trend.tool_id,
        hours: trend.hours, output: trend.output, input: trend.input,
        defect_qty: trend.defect_qty, defect_ratio: trend.defect_ratio, total: trend.total,
      },
      eqActions,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
