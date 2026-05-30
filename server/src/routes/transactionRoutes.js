const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { createTransaction, createBulkTransactions, voidTransaction } = require('../controllers/transactionController');

router.post('/', verifyToken, createTransaction);
router.post('/bulk', verifyToken, createBulkTransactions);
router.post('/:id/void', verifyToken, checkRole(['owner']), voidTransaction);

module.exports = router;
