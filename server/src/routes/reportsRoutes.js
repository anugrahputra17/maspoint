const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getDashboardMetrics, getSalesTrend } = require('../controllers/reportsController');

// Owner-only route
router.get('/dashboard', verifyToken, requireRole(['owner']), getDashboardMetrics);
router.get('/trend', verifyToken, requireRole(['owner']), getSalesTrend);

module.exports = router;
