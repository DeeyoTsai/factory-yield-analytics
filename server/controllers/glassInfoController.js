const { GlassInfo, Pdamtable, ReworkHis, OvenSlot, AdiRecord, TrendChart } = require('../models');

exports.getGlassInfoByRgbId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'RgbTopFive ID is required' });
    }

    const results = await GlassInfo.findAll({
      where: { rgbtopfive_id: id },
      include: [
        { 
          model: Pdamtable, 
          as: 'pdamtable',
          attributes: ['product']
        },
        {
          model: ReworkHis,
          as: 'reworkhis'
        },
        {
          model: OvenSlot,
          as: 'ovenslot'
        },
        {
          model: AdiRecord,
          as: 'adirecord'
        }
      ]
    });

    // 前端 DefectStationProfile 用它比對「集中趨勢圖實際查了哪一站」與「哪一站真的檢出最多」。
    // ⚠️ 刻意不重用 GET /api/trend-chart/by-rgb/:id —— 那支會連帶跑 fetchEqActionsForTrend()
    // （對 begintime/endtime 做 STR_TO_DATE 比對、走不到 index），只為拿三個欄位不值得。
    // 也刻意不在前端自己套爬蟲那套推導規則：一旦與爬蟲漂移，UI 會宣稱查了 X 但實際查的是 Y，
    // 比不顯示更糟。要比對的就是實際存下來的值。
    // findAll 而非 findOne：同一個 defect 若兩條線（phase 1/2）都有發生，趨勢會有兩筆。
    // 帶 id 是為了讓前端能用 GET /api/trend-chart/:id 逐一取圖（沿用 TrendChartMui 的 apiPath）。
    const trendMetas = await TrendChart.findAll({
      where: { rgbtopfive_id: id },
      attributes: ['id', 'process', 'tool_id', 'dfcode'],
      order: [['process', 'ASC']],
    });

    res.status(200).json({ results, trendMetas });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
