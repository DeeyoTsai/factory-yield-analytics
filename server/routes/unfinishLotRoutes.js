const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/unfinishLotController');

router.get('/list', ctrl.listByDay);
router.get('/defect/:defectId/details', ctrl.getDefectDetails);
router.get('/defect/:defectId/trend', ctrl.getDefectTrend);
router.get('/:lotId/defects', ctrl.getDefects);

module.exports = router;
