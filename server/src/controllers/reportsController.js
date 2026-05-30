const db = require('../config/db');

// GET /api/reports/dashboard
const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Total Revenue (Omzet) - sum of total_final for all non-voided transactions
    const revenueResult = await db.query(`
      SELECT SUM(total_final) as total_revenue, COUNT(id) as total_transactions
      FROM transactions 
      WHERE is_voided = false
    `);
    
    // 2. Total Profit (Keuntungan Bersih) - sum of (selling_price - cost_price) * quantity
    const profitResult = await db.query(`
      SELECT SUM((ti.selling_price - ti.cost_price) * ti.quantity) as total_profit
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.is_voided = false
    `);

    // 3. Recent Transactions (Riwayat Transaksi) - last 50 transactions
    const recentTxResult = await db.query(`
      SELECT t.id, t.invoice_number, t.subtotal, t.discount, t.tax, t.total_final, 
             t.payment_method, t.created_at, t.is_voided,
             s.user_id, u.name as cashier_name
      FROM transactions t
      JOIN shifts s ON t.shift_id = s.id
      JOIN users u ON s.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `);

    const totalRevenue = revenueResult.rows[0].total_revenue || 0;
    const totalTransactions = revenueResult.rows[0].total_transactions || 0;
    const totalProfit = profitResult.rows[0].total_profit || 0;

    res.json({
      metrics: {
        totalRevenue: parseInt(totalRevenue, 10),
        totalProfit: parseInt(totalProfit, 10),
        totalTransactions: parseInt(totalTransactions, 10)
      },
      recentTransactions: recentTxResult.rows
    });

  } catch (error) {
    console.error('Error fetching dashboard reports:', error);
    res.status(500).json({ message: 'Gagal memuat laporan dashboard.' });
  }
};

const getSalesTrend = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') AS sale_date,
        COALESCE(SUM(total_final), 0) AS revenue,
        COUNT(id) AS transactions
      FROM transactions
      WHERE is_voided = false
        AND created_at >= (CURRENT_DATE - INTERVAL '6 days')
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY sale_date ASC
    `);

    const trendMap = {};
    result.rows.forEach((row) => {
      const key = row.sale_date.toISOString().slice(0, 10);
      trendMap[key] = {
        revenue: parseInt(row.revenue, 10),
        transactions: parseInt(row.transactions, 10),
      };
    });

    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        revenue: trendMap[key]?.revenue || 0,
        transactions: trendMap[key]?.transactions || 0,
      });
    }

    res.json({ trend: days });
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    res.status(500).json({ message: 'Gagal memuat tren penjualan.' });
  }
};

module.exports = { getDashboardMetrics, getSalesTrend };
