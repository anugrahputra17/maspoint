import db from '../db/dexieDB';

/**
 * Sinkronisasi produk dari API ke IndexedDB.
 * Dipanggil saat Dashboard/Kasir dibuka dan online.
 */
export const syncProductsToLocal = async (api) => {
  try {
    const res = await api.get('/products');
    const { products, categories, allowNegativeStock, qrisImageUrl } = res.data;

    // Bulk put (upsert) ke IndexedDB
    await db.products.clear();
    await db.products.bulkPut(products);

    await db.categories.clear();
    await db.categories.bulkPut(categories);

    await db.settings.put({ key: 'allow_negative_stock', value: allowNegativeStock });
    if (qrisImageUrl) {
      await db.settings.put({ key: 'qris_image_url', value: qrisImageUrl });
    }

    console.log(`[Sync] ${products.length} produk, ${categories.length} kategori tersinkronisasi.`);
    return { products, categories, allowNegativeStock, qrisImageUrl };
  } catch (error) {
    console.warn('[Sync] Gagal sinkronisasi dari API, menggunakan data lokal.', error.message);
    return null;
  }
};

/**
 * Ambil semua produk dari IndexedDB (offline-ready).
 */
export const getLocalProducts = async () => {
  const products = await db.products.toArray();
  const categories = await db.categories.toArray();
  const setting = await db.settings.get('allow_negative_stock');
  const qrisSetting = await db.settings.get('qris_image_url');
  return {
    products,
    categories,
    allowNegativeStock: setting?.value ?? false,
    qrisImageUrl: qrisSetting?.value ?? null,
  };
};

/**
 * Kurangi stok produk secara lokal di IndexedDB.
 */
export const decrementLocalStock = async (productId, quantity) => {
  await db.products.where('id').equals(productId).modify(product => {
    product.stock = Math.max(0, product.stock - quantity);
  });
};

/**
 * Simpan transaksi ke offline queue.
 */
export const queueOfflineTransaction = async (transactionData) => {
  await db.offlineTransactions.add({
    ...transactionData,
    _localStockApplied: true,
    created_at: new Date().toISOString(),
  });
};

/**
 * Ambil dan kirim semua transaksi offline saat kembali online (Bulk Sync).
 */
export const processOfflineQueue = async (api) => {
  try {
    const queue = await db.offlineTransactions.toArray();
    if (queue.length === 0) return { synced: 0, error: null };

    console.log(`[OfflineSync] Mencoba mengirim ${queue.length} transaksi tertunda via Bulk API...`);

    const payload = queue.map(({ localId, ...tx }) => ({
      ...tx,
      _localStockApplied: tx._localStockApplied !== false,
    }));

    const res = await api.post('/transactions/bulk', { transactions: payload });

    const ids = queue.map((tx) => tx.localId);
    await db.offlineTransactions.bulkDelete(ids);

    console.log(`[OfflineSync] BERHASIL: ${queue.length} transaksi sukses disinkronkan.`, res.data?.message || '');
    return { synced: queue.length, error: null };
  } catch (error) {
    const msg = error.response?.data?.message || error.message || 'Sinkronisasi gagal';
    console.error(`[OfflineSync] GAGAL: ${msg}`);
    return { synced: 0, error: msg };
  }
};

/** Jumlah transaksi yang belum tersinkron ke server */
export const getPendingOfflineCount = async () => db.offlineTransactions.count();
