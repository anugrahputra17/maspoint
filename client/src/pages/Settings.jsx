import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Settings = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [qrisImageUrl, setQrisImageUrl] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setAllowNegativeStock(res.data.allowNegativeStock);
      setQrisImageUrl(res.data.qrisImageUrl || null);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleStock = async () => {
    const newValue = !allowNegativeStock;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/settings', { allowNegativeStock: newValue });
      setAllowNegativeStock(res.data.allowNegativeStock);
      setMessage({ type: 'success', text: 'Pengaturan stok berhasil disimpan.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleQrisUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/settings/qris-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQrisImageUrl(res.data.qrisImageUrl);
      setMessage({ type: 'success', text: 'Gambar QRIS berhasil diunggah.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal mengunggah gambar QRIS.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Pengaturan Toko</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola preferensi operasional dan pembayaran QRIS.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stok Minus Toggle */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">📦</span>
              <h2 className="text-lg font-black text-slate-800">Izinkan Stok Minus</h2>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowNegativeStock}
              onClick={handleToggleStock}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                allowNegativeStock ? 'bg-blue-600' : 'bg-slate-200'
              } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  allowNegativeStock ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Jika diaktifkan, kasir tetap bisa menjual produk meskipun stok habis (stok akan menjadi negatif).
            Nonaktifkan untuk mencegah penjualan saat stok kosong.
          </p>
          <div className={`px-4 py-3 rounded-xl text-xs font-bold ${
            allowNegativeStock
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            Status: {allowNegativeStock ? '⚠️ Stok minus DIIZINKAN' : '✅ Stok minus DIBLOKIR'}
          </div>
        </div>

        {/* QRIS Image Upload */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📱</span>
            <h2 className="text-lg font-black text-slate-800">QR Code Pembayaran QRIS</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Unggah gambar QR Code statis toko. Gambar ini akan ditampilkan di halaman kasir saat metode QRIS dipilih.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-48 h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {qrisImageUrl ? (
                <img
                  src={`${API_BASE_URL}${qrisImageUrl}`}
                  alt="QRIS Toko"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-4">
                  <span className="text-4xl block mb-2 opacity-30">📷</span>
                  <p className="text-xs font-bold text-slate-400">Belum ada QR</p>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <label className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all">
                {uploading ? 'Mengunggah...' : '📤 Unggah Gambar QRIS'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleQrisUpload}
                />
              </label>
              <p className="text-xs text-slate-400">Format: JPG, PNG, WebP · Maks. 2 MB</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
