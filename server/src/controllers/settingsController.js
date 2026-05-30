const db = require('../config/db');

const upsertSetting = async (key, value) => {
  await db.query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES ($1, $2)
     ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2`,
    [key, value]
  );
};

const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const map = {};
    result.rows.forEach((row) => {
      map[row.setting_key] = row.setting_value;
    });

    res.json({
      allowNegativeStock: map.allow_negative_stock === 'true',
      qrisImageUrl: map.qris_image_url || null,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Gagal memuat pengaturan.' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { allowNegativeStock } = req.body;

    if (allowNegativeStock !== undefined) {
      await upsertSetting('allow_negative_stock', allowNegativeStock ? 'true' : 'false');
    }

    const result = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const map = {};
    result.rows.forEach((row) => {
      map[row.setting_key] = row.setting_value;
    });

    res.json({
      message: 'Pengaturan berhasil disimpan',
      allowNegativeStock: map.allow_negative_stock === 'true',
      qrisImageUrl: map.qris_image_url || null,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Gagal menyimpan pengaturan.' });
  }
};

const uploadQrisImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file gambar QRIS yang diunggah.' });
  }

  try {
    const imageUrl = `/uploads/settings/${req.file.filename}`;
    await upsertSetting('qris_image_url', imageUrl);

    res.json({
      message: 'Gambar QRIS berhasil diunggah',
      qrisImageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Upload QRIS image error:', error);
    res.status(500).json({ message: 'Gagal mengunggah gambar QRIS.' });
  }
};

module.exports = { getSettings, updateSettings, uploadQrisImage };
