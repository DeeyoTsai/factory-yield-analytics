const express = require('express');
const router = express.Router();
const eqActionController = require('../controllers/eqActionController');

router.get('/', eqActionController.getAllEqActions);
router.get('/:id', eqActionController.getEqActionById);
router.post('/', eqActionController.createEqAction);

module.exports = router;
