import Dexie from 'dexie';

const db = new Dexie('LitePOS');

db.version(1).stores({
  // Produk lokal: index by id, category_id, name, sku_barcode
  products: 'id, category_id, sku_barcode, name',
  // Kategori lokal
  categories: 'id, name',
  // Antrean transaksi offline
  offlineTransactions: '++localId, created_at',
  // Settings cache
  settings: 'key',
});

export default db;
