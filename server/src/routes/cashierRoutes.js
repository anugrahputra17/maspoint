const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { getCashiers, createCashier, updateCashier } = require('../controllers/cashierController');

router.get('/', verifyToken, checkRole(['owner']), getCashiers);
router.post('/', verifyToken, checkRole(['owner']), createCashier);
router.put('/:id', verifyToken, checkRole(['owner']), updateCashier);

module.exports = router;
