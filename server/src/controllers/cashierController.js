const bcrypt = require('bcryptjs');
const db = require('../config/db');

const PIN_REGEX = /^\d{6}$/;

const getCashiers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, name, role, is_active, created_at
       FROM users
       WHERE role = 'cashier'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get cashiers error:', error);
    res.status(500).json({ message: 'Gagal mengambil data kasir' });
  }
};

const createCashier = async (req, res) => {
  try {
    const { username, name, pin } = req.body;

    if (!username?.trim() || !name?.trim() || !pin) {
      return res.status(400).json({ message: 'Username, nama, dan PIN wajib diisi' });
    }

    if (!PIN_REGEX.test(String(pin))) {
      return res.status(400).json({ message: 'PIN harus berupa 6 digit angka' });
    }

    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }

    const pinHash = await bcrypt.hash(String(pin), 10);
    const passwordHash = await bcrypt.hash(String(pin), 10);

    const result = await db.query(
      `INSERT INTO users (username, password_hash, pin_hash, name, role)
       VALUES ($1, $2, $3, $4, 'cashier')
       RETURNING id, username, name, role, is_active, created_at`,
      [username.trim(), passwordHash, pinHash, name.trim()]
    );

    res.status(201).json({
      message: 'Kasir berhasil ditambahkan',
      cashier: result.rows[0],
    });
  } catch (error) {
    console.error('Create cashier error:', error);
    res.status(500).json({ message: 'Gagal menambahkan kasir' });
  }
};

const updateCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, pin } = req.body;

    const existing = await db.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [id, 'cashier']
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Kasir tidak ditemukan' });
    }

    if (pin !== undefined && pin !== null && pin !== '') {
      if (!PIN_REGEX.test(String(pin))) {
        return res.status(400).json({ message: 'PIN harus berupa 6 digit angka' });
      }
      const pinHash = await bcrypt.hash(String(pin), 10);
      const passwordHash = await bcrypt.hash(String(pin), 10);
      await db.query(
        'UPDATE users SET pin_hash = $1, password_hash = $2 WHERE id = $3',
        [pinHash, passwordHash, id]
      );
    }

    if (is_active !== undefined) {
      await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    }

    const updated = await db.query(
      'SELECT id, username, name, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Data kasir berhasil diperbarui',
      cashier: updated.rows[0],
    });
  } catch (error) {
    console.error('Update cashier error:', error);
    res.status(500).json({ message: 'Gagal memperbarui data kasir' });
  }
};

module.exports = { getCashiers, createCashier, updateCashier };
