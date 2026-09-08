const express = require('express');
const router = express.Router();
const pdamtableController = require('../controllers/pdamtableController');

router.get('/by-rgb/:id', pdamtableController.getPdamtableByRgbId);

module.exports = router;
