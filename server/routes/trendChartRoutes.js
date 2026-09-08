const express = require('express');
const router = express.Router();
const trendChartController = require('../controllers/trendChartController');

router.get('/by-rgb/:id', trendChartController.getByRgbId);
// 依 TrendChart 主鍵取單筆。同一個 rgbtopfive 可能有多筆（phase 1/2 各一），
// 前端拿 glass-info 回傳的 trendMetas[].id 逐一打這支。
router.get('/:id', trendChartController.getById);

module.exports = router;
