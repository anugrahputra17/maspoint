const express = require('express');
const router = express.Router();
const { openShift, closeShift, getShiftStatus, getShiftSummary, getShiftTransactions } = require('../controllers/shiftController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/open', openShift);
router.post('/close', closeShift);
router.get('/status/:userId', getShiftStatus);
router.get('/summary', getShiftSummary);
router.get('/transactions', getShiftTransactions);

module.exports = router;
