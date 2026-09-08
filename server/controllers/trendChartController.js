const { TrendChart } = require('../models');
const { fetchEqActionsForTrend } = require('./helpers/trendEqActions');

exports.getByRgbId = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(id);

    if (!id) return res.status(400).json({ message: 'RgbTopFive ID is required' });

    const trend = await TrendChart.findOne({ where: { rgbtopfive_id: id } });
    if (!trend) return res.status(404).json({ message: 'TrendChart not found' });
    // console.log(trend);

    // 查同日、同 process 機台的機況紀錄
    const eqActions = await fetchEqActionsForTrend(trend);
    
    res.status(200).json({
      trend: {
        dfcode:       trend.dfcode,
        day:          trend.day,
        process:      trend.process,
        tool_id:      trend.tool_id,
        hours:        trend.hours,
        output:       trend.output,
        input:        trend.input,
        defect_qty:   trend.defect_qty,
        defect_ratio: trend.defect_ratio,
        total:        trend.total,
      },
      eqActions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 依 TrendChart 主鍵取單筆。回應 shape 與 getByRgbId 完全相同，前端才能直接沿用
// TrendChartMui 的 apiPath prop（未結批頁也是這樣用的），該元件一行都不用改。
// 存在的理由：同一個 rgbtopfive 現在可能有兩筆（phase 1/2 各一），getByRgbId 的
// findOne 只拿得到其中一筆。
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'TrendChart ID is required' });

    const trend = await TrendChart.findByPk(id);
    if (!trend) return res.status(404).json({ message: 'TrendChart not found' });

    const eqActions = await fetchEqActionsForTrend(trend);

    res.status(200).json({
      trend: {
        dfcode:       trend.dfcode,
        day:          trend.day,
        process:      trend.process,
        tool_id:      trend.tool_id,
        hours:        trend.hours,
        output:       trend.output,
        input:        trend.input,
        defect_qty:   trend.defect_qty,
        defect_ratio: trend.defect_ratio,
        total:        trend.total,
      },
      eqActions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
