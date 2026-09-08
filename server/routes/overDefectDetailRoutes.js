const express = require('express');
const router = express.Router();
const overDefectDetailController = require('../controllers/overDefectDetailController');

router.get('/', overDefectDetailController.getOverDefectDetails);

module.exports = router;
