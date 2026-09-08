const express = require('express');
const router = express.Router();
const hourlyDefectController = require('../controllers/hourlyDefectController');

router.get('/', hourlyDefectController.getHourlyDefectsByDay);

module.exports = router;
