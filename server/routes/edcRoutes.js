const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/edcController');

router.get('/summary', ctrl.listSummary);
router.get('/group/flagged', ctrl.getGroupFlagged);
router.put('/comment', ctrl.upsertComment);
router.post('/crawl', ctrl.crawlNow);
router.get('/crawl/status', ctrl.crawlStatus);

module.exports = router;
