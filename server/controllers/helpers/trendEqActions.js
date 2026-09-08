const { EqAction, sequelize } = require('../../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

// 依 trend 的 hours 時間窗（前後各推 1 小時）查同 process 的機況紀錄
// 從 trendChartController.getByRgbId 抽出，daily 與未結批共用
async function fetchEqActionsForTrend(trend) {
  let chartStart = new Date().getFullYear() + '/' + trend.hours[0].split(' ')[0] + ' ' + trend.hours[0].split(' ')[1] + ':00:00';
  const chartStartObj = new Date(chartStart);
  chartStartObj.setHours(chartStartObj.getHours() - 1);
  chartStart = dayjs(chartStartObj).format('YYYY/MM/DD HH:mm:ss');

  let chartEndTime = new Date().getFullYear() + '/' + trend.hours[trend.hours.length - 1].split(' ')[0] + ' ' + trend.hours[trend.hours.length - 1].split(' ')[1] + ':00:00';
  const chartEndTimeObj = new Date(chartEndTime);
  chartEndTimeObj.setHours(chartEndTimeObj.getHours() + 1);
  chartEndTime = dayjs(chartEndTimeObj).format('YYYY/MM/DD HH:mm:ss');

  return EqAction.findAll({
    where: {
      [Op.and]: [
        { line: trend.process },
        sequelize.where(sequelize.fn('STR_TO_DATE', sequelize.col('begintime'), '%Y/%m/%d %H:%i:%s'), Op.gte, chartStart),
        sequelize.where(sequelize.fn('STR_TO_DATE', sequelize.col('endtime'), '%Y/%m/%d %H:%i:%s'), Op.lte, chartEndTime),
      ],
    },
    attributes: ['eq', 'code', 'status', 'description', 'action', 'begintime', 'endtime', 'handler', 'product'],
    order: [['begintime', 'ASC']],
  });
}

module.exports = { fetchEqActionsForTrend };
