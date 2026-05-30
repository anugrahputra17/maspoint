const db = require('../config/db');
const { verifyCredential } = require('../utils/authHelpers');
const { generateSequentialInvoice } = require('../utils/invoiceNumber');

const resolveShiftId = async (client, shiftId, userId) => {
  if (shiftId) {
    const existing = await client.query('SELECT id FROM shifts WHERE id = $1', [shiftId]);
    if (existing.rows.length > 0) return shiftId;
  }

  const userShift = await client.query(
    `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open' ORDER BY start_time DESC LIMIT 1`,
    [userId]
  );
  if (userShift.rows.length > 0) return userShift.rows[0].id;

  return null;
};

/** Resolve shift for offline bulk sync — fallback agar transaksi lama tetap bisa disinkronkan */
const resolveShiftIdForBulk = async (client, shiftId, userId, createdAt) => {
  if (shiftId) {
    const existing = await client.query('SELECT id FROM shifts WHERE id = $1', [shiftId]);
    if (existing.rows.length > 0) return shiftId;
  }

  const userOpen = await resolveShiftId(client, null, userId);
  if (userOpen) return userOpen;

  const anyOpen = await client.query(
    `SELECT id FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`
  );
  if (anyOpen.rows.length > 0) return anyOpen.rows[0].id;

  if (createdAt) {
    const atTime = await client.query(
      `SELECT id FROM shifts
       WHERE start_time <= $1
         AND (end_time IS NULL OR end_time >= $1)
       ORDER BY start_time DESC
       LIMIT 1`,
      [createdAt]
    );
    if (atTime.rows.length > 0) return atTime.rows[0].id;
  }

  const lastShift = await client.query(
    `SELECT id FROM shifts ORDER BY COALESCE(end_time, start_time) DESC LIMIT 1`
  );
  return lastShift.rows[0]?.id || null;
};

// POST /api/transactions — Simpan transaksi baru (ACID)
const createTransaction = async (req, res) => {
  const client = await db.getClient();

  try {
    let { shift_id, items, subtotal, discount, tax, total_final, payment_method, amount_paid, amount_change } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Data transaksi tidak lengkap: items kosong.' });
    }

    // Jika shift_id tidak dikirim, cari shift terbuka user yang login
    shift_id = await resolveShiftId(client, shift_id, req.userId);
    if (!shift_id) {
      return res.status(400).json({ message: 'Tidak ada shift yang sedang berjalan. Silakan buka shift terlebih dahulu.' });
    }

    await client.query('BEGIN');

    const invoiceNumber = await generateSequentialInvoice(client);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Insert transaction
    const txResult = await client.query(
      `INSERT INTO transactions (shift_id, invoice_number, total_items, subtotal, discount, tax, total_final, payment_method, amount_paid, amount_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [shift_id, invoiceNumber, totalItems, subtotal, discount || 0, tax || 0, total_final, payment_method, amount_paid, amount_change]
    );

    const transaction = txResult.rows[0];

    // Insert items + update stock + snapshot cost_price from server
    for (const item of items) {
      const productResult = await client.query(
        'SELECT cost_price, selling_price, stock FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Produk ID ${item.product_id} tidak ditemukan.` });
      }

      const product = productResult.rows[0];

      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity, cost_price, selling_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [transaction.id, item.product_id, item.quantity, product.cost_price, item.selling_price, item.quantity * item.selling_price]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transaksi berhasil disimpan.',
      transaction,
      invoiceNumber,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Gagal menyimpan transaksi.', detail: error.message });
  } finally {
    client.release();
  }
};

const createBulkTransactions = async (req, res) => {
  const { transactions } = req.body;
  
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ message: 'Data bulk transaksi kosong atau tidak valid.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const savedInvoices = [];

    for (const tx of transactions) {
      const {
        shift_id,
        items,
        subtotal,
        discount,
        tax,
        total_final,
        payment_method,
        amount_paid,
        amount_change,
        created_at,
        _localStockApplied,
      } = tx;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Data transaksi offline tidak valid: items kosong.');
      }

      const resolvedShiftId = await resolveShiftIdForBulk(client, shift_id, req.userId, created_at);
      if (!resolvedShiftId) {
        throw new Error(
          'Tidak dapat menemukan shift untuk transaksi offline. Buka shift kasir terlebih dahulu, lalu coba sinkronkan lagi.'
        );
      }

      const txDate = created_at ? new Date(created_at) : new Date();
      const invoiceNumber = await generateSequentialInvoice(client, txDate);

      const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const method = ['cash', 'qris', 'transfer'].includes(payment_method) ? payment_method : 'cash';

      const txResult = await client.query(
        `INSERT INTO transactions (shift_id, invoice_number, total_items, subtotal, discount, tax, total_final, payment_method, amount_paid, amount_change, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP)) RETURNING id`,
        [
          resolvedShiftId,
          invoiceNumber,
          totalItems,
          subtotal || 0,
          discount || 0,
          tax || 0,
          total_final,
          method,
          amount_paid,
          amount_change ?? 0,
          created_at,
        ]
      );

      const transactionId = txResult.rows[0].id;
      savedInvoices.push(invoiceNumber);

      for (const item of items) {
        const productResult = await client.query(
          'SELECT cost_price, selling_price, stock FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) continue;

        const product = productResult.rows[0];

        await client.query(
          `INSERT INTO transaction_items (transaction_id, product_id, quantity, cost_price, selling_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [transactionId, item.product_id, item.quantity, product.cost_price, item.selling_price, item.quantity * item.selling_price]
        );

        if (!_localStockApplied) {
          await client.query(
            'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: `${transactions.length} transaksi offline berhasil disinkronkan.`, invoices: savedInvoices });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk transaction sync:', error);
    res.status(500).json({ message: error.message || 'Gagal melakukan sinkronisasi bulk transaksi.' });
  } finally {
    client.release();
  }
};

const voidTransaction = async (req, res) => {
  const client = await db.getClient();

  try {
    const { id } = req.params;
    const { password, pin } = req.body;

    if (!password && !pin) {
      return res.status(400).json({ message: 'Password atau PIN Owner wajib diisi untuk void transaksi.' });
    }

    const ownerResult = await db.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [req.userId, 'owner']
    );
    if (ownerResult.rows.length === 0) {
      return res.status(403).json({ message: 'Hanya Owner yang dapat membatalkan transaksi.' });
    }

    const owner = ownerResult.rows[0];
    const isAuthorized = await verifyCredential(owner, { password, pin });
    if (!isAuthorized) {
      return res.status(401).json({ message: 'Password/PIN Owner salah. Void ditolak.' });
    }

    await client.query('BEGIN');

    const txResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND is_voided = false FOR UPDATE',
      [id]
    );
    if (txResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan atau sudah dibatalkan.' });
    }

    const itemsResult = await client.query(
      'SELECT product_id, quantity FROM transaction_items WHERE transaction_id = $1',
      [id]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('UPDATE transactions SET is_voided = true WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({
      message: 'Transaksi berhasil dibatalkan (Void). Stok produk telah dikembalikan.',
      transactionId: parseInt(id, 10),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error voiding transaction:', error);
    res.status(500).json({ message: 'Gagal membatalkan transaksi.' });
  } finally {
    client.release();
  }
};

module.exports = { createTransaction, createBulkTransactions, voidTransaction };
