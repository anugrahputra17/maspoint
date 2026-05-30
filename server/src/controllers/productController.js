const db = require('../config/db');

// GET /api/products — Semua produk aktif + kategori + system_settings
const getAllProducts = async (req, res) => {
  try {
    const productsResult = await db.query(`
      SELECT p.id, p.category_id, c.name as category_name,
             p.sku_barcode, p.name, p.cost_price, p.selling_price, p.stock, p.minimum_stock, p.is_active, p.image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.name ASC
    `);

    const categoriesResult = await db.query(`SELECT id, name FROM categories ORDER BY name ASC`);

    const settingResult = await db.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('allow_negative_stock', 'qris_image_url')`
    );
    const settingsMap = {};
    settingResult.rows.forEach((row) => {
      settingsMap[row.setting_key] = row.setting_value;
    });
    const allowNegativeStock = settingsMap.allow_negative_stock === 'true';
    const qrisImageUrl = settingsMap.qris_image_url || null;

    res.json({
      products: productsResult.rows,
      categories: categoriesResult.rows,
      allowNegativeStock,
      qrisImageUrl,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Gagal mengambil data produk.' });
  }
};

const restockProduct = async (req, res) => {
  const { id } = req.params;
  const { added_stock } = req.body;

  if (!added_stock || isNaN(added_stock) || added_stock <= 0) {
    return res.status(400).json({ message: 'Jumlah stok tidak valid.' });
  }

  try {
    const result = await db.query(
      'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [added_stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    res.json({ message: 'Stok berhasil diperbarui.', product: result.rows[0] });
  } catch (error) {
    console.error('Error restocking product:', error);
    res.status(500).json({ message: 'Gagal memperbarui stok produk.' });
  }
};

const createProduct = async (req, res) => {
  const { category_id, sku_barcode, name, cost_price, selling_price, stock, minimum_stock } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO products (category_id, sku_barcode, name, cost_price, selling_price, stock, minimum_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [category_id, sku_barcode, name, cost_price, selling_price, stock || 0, minimum_stock || 5]
    );
    res.status(201).json({ message: 'Produk berhasil ditambahkan', product: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Gagal menambahkan produk. Pastikan SKU unik.' });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { category_id, sku_barcode, name, cost_price, selling_price, minimum_stock } = req.body;

  try {
    const result = await db.query(
      `UPDATE products 
       SET category_id = $1, sku_barcode = $2, name = $3, cost_price = $4, selling_price = $5, minimum_stock = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [category_id, sku_barcode, name, cost_price, selling_price, minimum_stock, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    res.json({ message: 'Produk berhasil diubah', product: result.rows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Gagal mengubah produk.' });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete: is_active = false
    const result = await db.query(
      `UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    res.json({ message: 'Produk berhasil dihapus (soft delete)' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Gagal menghapus produk.' });
  }
};

const uploadProductImage = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file gambar yang diunggah.' });
  }

  try {
    const imageUrl = `/uploads/products/${req.file.filename}`;
    const result = await db.query(
      'UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [imageUrl, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    res.json({ message: 'Gambar produk berhasil diunggah', image_url: imageUrl, product: result.rows[0] });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ message: 'Gagal mengunggah gambar produk.' });
  }
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
};

const importProductsCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File CSV wajib diunggah.' });
  }

  const client = await db.getClient();

  try {
    const content = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      return res.status(400).json({ message: 'File CSV kosong atau hanya berisi header.' });
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const expected = ['sku_barcode', 'nama_produk', 'id_kategori', 'harga_modal', 'harga_jual', 'stok', 'stok_minimum'];
    const hasValidHeader = expected.every((col, idx) => header[idx]?.includes(col.split('_')[0]) || header.includes(col));

    if (!hasValidHeader && !header.some((h) => h.includes('sku'))) {
      return res.status(400).json({
        message: 'Format header CSV tidak valid. Gunakan: sku_barcode,nama_produk,id_kategori,harga_modal,harga_jual,stok,stok_minimum',
      });
    }

    await client.query('BEGIN');

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 7) {
        errors.push({ row: i + 1, message: 'Kolom tidak lengkap' });
        continue;
      }

      const [sku, name, categoryId, costPrice, sellingPrice, stock, minimumStock] = cols;
      if (!sku || !name) {
        errors.push({ row: i + 1, message: 'SKU atau nama produk kosong' });
        continue;
      }

      const existing = await client.query('SELECT id FROM products WHERE sku_barcode = $1', [sku]);
      await client.query(
        `INSERT INTO products (category_id, sku_barcode, name, cost_price, selling_price, stock, minimum_stock, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (sku_barcode) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           cost_price = EXCLUDED.cost_price,
           selling_price = EXCLUDED.selling_price,
           stock = EXCLUDED.stock,
           minimum_stock = EXCLUDED.minimum_stock,
           is_active = true,
           updated_at = NOW()`,
        [
          parseInt(categoryId, 10) || 1,
          sku,
          name,
          parseInt(costPrice, 10) || 0,
          parseInt(sellingPrice, 10) || 0,
          parseInt(stock, 10) || 0,
          parseInt(minimumStock, 10) || 5,
        ]
      );

      if (existing.rows.length > 0) updated += 1;
      else created += 1;
    }

    await client.query('COMMIT');

    res.json({
      message: `Import selesai: ${created} baru, ${updated} diperbarui.`,
      created,
      updated,
      errors,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error importing CSV:', error);
    res.status(500).json({ message: 'Gagal mengimpor file CSV.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllProducts,
  restockProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  importProductsCsv,
};
