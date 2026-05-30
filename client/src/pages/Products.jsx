import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalProducts, syncProductsToLocal } from '../services/syncService';
import { fuzzyFilterProducts } from '../utils/fuzzyMatch';
import { API_BASE_URL } from '../config';

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');

const getCategoryEmoji = (categoryId) => {
  const map = { 1: '🥤', 2: '🍚', 3: '🍿', 4: '📦' };
  return map[categoryId] || '🛍️';
};

const Products = () => {
  const { api } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');
  
  // CRUD Modal State
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [crudMode, setCrudMode] = useState('create'); // 'create' | 'edit'
  const [formData, setFormData] = useState({
    sku_barcode: '', name: '', category_id: 1, cost_price: 0, selling_price: 0, stock: 0, minimum_stock: 5
  });
  const [imageFile, setImageFile] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    const synced = await syncProductsToLocal(api);
    if (synced) {
      setProducts(synced.products);
      setCategories(synced.categories);
    } else {
      const local = await getLocalProducts();
      setProducts(local.products);
      setCategories(local.categories);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenRestock = (product) => {
    setSelectedProduct(product);
    setRestockAmount('');
    setIsRestockModalOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const amount = parseInt(restockAmount, 10);
    if (!amount || amount <= 0) return alert('Jumlah stok tidak valid');

    setIsSubmitting(true);
    try {
      await api.post(`/products/${selectedProduct.id}/restock`, { added_stock: amount });
      setIsRestockModalOpen(false);
      await fetchProducts();
    } catch (error) {
      console.error('Error restocking product:', error);
      alert('Gagal menambah stok produk. Pastikan internet terhubung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCrud = (mode, product = null) => {
    setCrudMode(mode);
    if (mode === 'edit' && product) {
      setSelectedProduct(product);
      setFormData({
        sku_barcode: product.sku_barcode,
        name: product.name,
        category_id: product.category_id,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock: product.stock,
        minimum_stock: product.minimum_stock
      });
    } else {
      setSelectedProduct(null);
      setFormData({ sku_barcode: '', name: '', category_id: categories[0]?.id || 1, cost_price: 0, selling_price: 0, stock: 0, minimum_stock: 5 });
    }
    setImageFile(null);
    setIsCrudModalOpen(true);
  };

  const handleCrudSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let productId;
      if (crudMode === 'create') {
        const res = await api.post('/products', formData);
        productId = res.data.product.id;
      } else {
        await api.put(`/products/${selectedProduct.id}`, formData);
        productId = selectedProduct.id;
      }
      
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        await api.post(`/products/${productId}/upload-image`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsCrudModalOpen(false);
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan produk. Pastikan SKU unik.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus produk ini? Produk hanya akan dinonaktifkan agar riwayat transaksi tetap aman.')) return;
    try {
      await api.delete(`/products/${id}`);
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Gagal menghapus produk.');
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert('Pilih file CSV terlebih dahulu.');
    setIsSubmitting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.post('/products/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      await fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengimpor CSV.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadCsvTemplate = () => {
    const header = 'sku_barcode,nama_produk,id_kategori,harga_modal,harga_jual,stok,stok_minimum';
    const sample = '899999900099,Contoh Produk Baru,1,5000,7500,50,10';
    const blob = new Blob([`${header}\n${sample}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-produk.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredProducts = searchQuery.trim()
    ? fuzzyFilterProducts(products, searchQuery)
    : products;

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Manajemen Stok</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola data produk dan persediaan barang Anda.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border border-slate-200 focus:border-blue-500 shadow-sm"
                placeholder="Cari SKU atau Nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setIsImportModalOpen(true); setCsvFile(null); setImportResult(null); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl shadow-md transition-all whitespace-nowrap text-sm"
            >
              📥 Import CSV
            </button>
            <button 
              onClick={() => handleOpenCrud('create')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              + Produk Baru
            </button>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Info Produk</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">SKU / Kategori</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Harga (Modal / Jual)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Sisa Stok</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map(product => {
                    const isLowStock = product.stock <= product.minimum_stock;
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 shrink-0 overflow-hidden">
                              {product.image_url ? (
                                <img src={`${API_BASE_URL}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                getCategoryEmoji(product.category_id)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{product.name}</p>
                              {isLowStock && <p className="text-[10px] font-bold text-red-500 mt-0.5">⚠️ Stok Menipis</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block">{product.sku_barcode}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-1">{product.category_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-400 line-through decoration-slate-300">{formatRp(product.cost_price)}</p>
                          <p className="text-sm font-black text-blue-600">{formatRp(product.selling_price)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex flex-col items-center justify-center">
                            <span className={`text-lg font-black ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                              {product.stock}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenRestock(product)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors">
                              + Stok
                            </button>
                            <button onClick={() => handleOpenCrud('edit', product)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors" title="Edit">
                              ✏️
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors" title="Hapus">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                        Produk tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── RESTOCK MODAL ── */}
      {isRestockModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Restock Produk</h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="p-6">
                <p className="text-sm font-bold text-slate-800 mb-4">{selectedProduct.name} (Stok: {selectedProduct.stock})</p>
                <label className="text-xs font-bold text-slate-600 uppercase">Jumlah Masuk (Pcs)</label>
                <input type="number" min="1" autoFocus required className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} />
              </div>
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsRestockModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CRUD MODAL ── */}
      {isCrudModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800">{crudMode === 'create' ? 'Tambah Produk Baru' : 'Edit Data Produk'}</h3>
              <button onClick={() => setIsCrudModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center text-slate-500 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCrudSubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">SKU / Barcode</label>
                    <input required type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.sku_barcode} onChange={e => setFormData({...formData, sku_barcode: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori</label>
                    <select required className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Produk</label>
                  <input required type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Gambar Produk</label>
                  <input type="file" accept="image/*" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setImageFile(e.target.files[0])} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Harga Modal (Rp)</label>
                    <input required type="number" min="0" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Harga Jual (Rp)</label>
                    <input required type="number" min="0" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {crudMode === 'create' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Stok Awal</label>
                      <input required type="number" min="0" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Batas Stok Minimum</label>
                    <input required type="number" min="0" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" value={formData.minimum_stock} onChange={e => setFormData({...formData, minimum_stock: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCrudModalOpen(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CSV IMPORT MODAL ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Import Produk CSV</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upsert berdasarkan SKU — data lama akan diperbarui</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center text-slate-500 font-bold">✕</button>
            </div>
            <form onSubmit={handleCsvImport}>
              <div className="p-6 space-y-4">
                <button type="button" onClick={downloadCsvTemplate} className="text-xs font-bold text-blue-600 hover:text-blue-700 underline">
                  ⬇️ Unduh Template CSV
                </button>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">File CSV</label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    required
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Kolom: sku_barcode, nama_produk, id_kategori, harga_modal, harga_jual, stok, stok_minimum
                </p>
                {importResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700">
                    {importResult.message}
                    {importResult.errors?.length > 0 && (
                      <p className="mt-1 text-amber-700">{importResult.errors.length} baris gagal diproses.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-200">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg disabled:opacity-60">
                  {isSubmitting ? 'Mengimpor...' : 'Import Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
