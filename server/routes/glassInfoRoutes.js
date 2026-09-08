const express = require('express');
const router = express.Router();
const glassInfoController = require('../controllers/glassInfoController');

router.get('/by-rgb/:id', glassInfoController.getGlassInfoByRgbId);

module.exports = router;
