const db = require('../config/db');

const openShift = async (req, res) => {
  try {
    const { cash_start } = req.body;
    const userId = req.userId;

    if (cash_start === undefined) {
      return res.status(400).json({ message: 'cash_start is required' });
    }

    // Check if user already has an open shift
    const existingShift = await db.query('SELECT id FROM shifts WHERE user_id = $1 AND status = $2', [userId, 'open']);
    if (existingShift.rows.length > 0) {
      return res.status(400).json({ message: 'User already has an open shift' });
    }

    const newShift = await db.query(
      'INSERT INTO shifts (user_id, cash_start) VALUES ($1, $2) RETURNING *',
      [userId, cash_start]
    );

    res.status(201).json(newShift.rows[0]);
  } catch (error) {
    console.error('Open shift error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const closeShift = async (req, res) => {
  try {
    const { cash_end } = req.body;
    const userId = req.userId;

    if (cash_end === undefined) {
      return res.status(400).json({ message: 'cash_end is required' });
    }

    const shiftResult = await db.query('SELECT * FROM shifts WHERE user_id = $1 AND status = $2', [userId, 'open']);
    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ message: 'No open shift found for this user' });
    }

    const shift = shiftResult.rows[0];

    // Calculate total expected from transactions during this shift (cash payments only)
    const txResult = await db.query(
      'SELECT SUM(amount_paid - amount_change) as total_cash_sales FROM transactions WHERE shift_id = $1 AND payment_method = $2 AND is_voided = false',
      [shift.id, 'cash']
    );
    
    const totalCashSales = parseInt(txResult.rows[0].total_cash_sales || 0, 10);
    const totalExpected = parseInt(shift.cash_start, 10) + totalCashSales;
    
    // Close the shift
    const closedShift = await db.query(
      `UPDATE shifts 
       SET end_time = CURRENT_TIMESTAMP, cash_end = $1, total_expected = $2, total_actual = $1, status = $3 
       WHERE id = $4 RETURNING *`,
      [cash_end, totalExpected, 'closed', shift.id]
    );

    const resultShift = closedShift.rows[0];
    const selisih = parseInt(resultShift.cash_end, 10) - parseInt(resultShift.total_expected, 10);

    res.json({
      message: 'Shift closed successfully',
      shift: resultShift,
      selisih
    });
  } catch (error) {
    console.error('Close shift error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getShiftStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // If the requesting user is a cashier, they can only check their own status
    if (req.userRole === 'cashier' && parseInt(userId, 10) !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const shiftResult = await db.query('SELECT * FROM shifts WHERE user_id = $1 AND status = $2', [userId, 'open']);
    
    if (shiftResult.rows.length > 0) {
      res.json({ hasOpenShift: true, shift: shiftResult.rows[0] });
    } else {
      res.json({ hasOpenShift: false });
    }
  } catch (error) {
    console.error('Get shift status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getOpenShiftForUser = async (userId) => {
  const result = await db.query(
    'SELECT * FROM shifts WHERE user_id = $1 AND status = $2',
    [userId, 'open']
  );
  return result.rows[0] || null;
};

const getShiftSummary = async (req, res) => {
  try {
    const shift = await getOpenShiftForUser(req.userId);
    if (!shift) {
      return res.json({
        hasShift: false,
        metrics: { totalRevenue: 0, totalTransactions: 0, totalItemsSold: 0, cashRevenue: 0, qrisRevenue: 0 },
        recentTransactions: [],
      });
    }

    const metricsResult = await db.query(
      `SELECT
         COALESCE(SUM(total_final), 0) AS total_revenue,
         COUNT(id) AS total_transactions,
         COALESCE(SUM(total_items), 0) AS total_items_sold,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_final ELSE 0 END), 0) AS cash_revenue,
         COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total_final ELSE 0 END), 0) AS qris_revenue
       FROM transactions
       WHERE shift_id = $1 AND is_voided = false`,
      [shift.id]
    );

    const recentTxResult = await db.query(
      `SELECT id, invoice_number, total_final, payment_method, total_items, created_at
       FROM transactions
       WHERE shift_id = $1 AND is_voided = false
       ORDER BY created_at DESC
       LIMIT 5`,
      [shift.id]
    );

    const row = metricsResult.rows[0];
    res.json({
      hasShift: true,
      shift,
      metrics: {
        totalRevenue: parseInt(row.total_revenue, 10),
        totalTransactions: parseInt(row.total_transactions, 10),
        totalItemsSold: parseInt(row.total_items_sold, 10),
        cashRevenue: parseInt(row.cash_revenue, 10),
        qrisRevenue: parseInt(row.qris_revenue, 10),
      },
      recentTransactions: recentTxResult.rows,
    });
  } catch (error) {
    console.error('Get shift summary error:', error);
    res.status(500).json({ message: 'Gagal memuat ringkasan shift.' });
  }
};

const getShiftTransactions = async (req, res) => {
  try {
    const shift = await getOpenShiftForUser(req.userId);
    if (!shift) {
      return res.status(404).json({ message: 'Tidak ada shift yang sedang berjalan.' });
    }

    const txResult = await db.query(
      `SELECT id, invoice_number, subtotal, discount, tax, total_final,
              payment_method, amount_paid, amount_change, total_items, created_at
       FROM transactions
       WHERE shift_id = $1 AND is_voided = false
       ORDER BY created_at DESC`,
      [shift.id]
    );

    res.json({ shift, transactions: txResult.rows });
  } catch (error) {
    console.error('Get shift transactions error:', error);
    res.status(500).json({ message: 'Gagal memuat riwayat transaksi shift.' });
  }
};

module.exports = { openShift, closeShift, getShiftStatus, getShiftSummary, getShiftTransactions };
