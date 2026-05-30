import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SalesTrendChart from '../components/SalesTrendChart';

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');
const PAGE_SIZE = 10;

const Reports = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: { totalRevenue: 0, totalProfit: 0, totalTransactions: 0 },
    recentTransactions: [],
  });
  const [trend, setTrend] = useState([]);

  const [voidModal, setVoidModal] = useState(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReports = async () => {
    try {
      const [dashRes, trendRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/trend'),
      ]);
      setData(dashRes.data);
      setTrend(trendRes.data.trend || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [api]);

  const { metrics, recentTransactions } = data;
  const totalPages = Math.max(1, Math.ceil(recentTransactions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedTransactions = recentTransactions.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [recentTransactions.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    if (!voidModal) return;
    setVoidLoading(true);
    setVoidError('');
    try {
      await api.post(`/transactions/${voidModal.id}/void`, { password: voidPassword });
      setVoidModal(null);
      setVoidPassword('');
      setLoading(true);
      await fetchReports();
    } catch (error) {
      setVoidError(error.response?.data?.message || 'Gagal void transaksi.');
    } finally {
      setVoidLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-4 text-slate-500 font-medium">Memuat Analitik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Ikhtisar Bisnis</h1>
          <p className="text-sm text-slate-500 mt-1">Pantau performa penjualan dan profitabilitas toko Anda secara real-time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden rounded-3xl p-6 group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-md" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">💰</div>
                <h3 className="text-white/80 font-bold text-sm uppercase tracking-wider">Total Omzet</h3>
              </div>
              <p className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">{formatRp(metrics.totalRevenue)}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl p-6 group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-md" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">📈</div>
                <h3 className="text-white/80 font-bold text-sm uppercase tracking-wider">Keuntungan Bersih</h3>
              </div>
              <p className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">{formatRp(metrics.totalProfit)}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl p-6 group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-md" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">🧾</div>
                <h3 className="text-white/80 font-bold text-sm uppercase tracking-wider">Total Transaksi</h3>
              </div>
              <p className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">
                {metrics.totalTransactions.toLocaleString('id-ID')} <span className="text-xl font-medium text-white/70">Nota</span>
              </p>
            </div>
          </div>
        </div>

        <SalesTrendChart data={trend} />

        <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Riwayat Transaksi Terbaru</h2>
            <button
              onClick={() => {
                if (recentTransactions.length === 0) return alert('Belum ada data untuk diexport');
                const headers = ['Waktu', 'Invoice', 'Kasir', 'Subtotal', 'Diskon', 'PPN', 'Total Final', 'Metode Bayar', 'Status'];
                const csvRows = [headers.join(',')];
                recentTransactions.forEach((tx) => {
                  csvRows.push([
                    `"${new Date(tx.created_at).toLocaleString('id-ID')}"`,
                    `"${tx.invoice_number}"`,
                    `"${tx.cashier_name}"`,
                    tx.subtotal,
                    tx.discount,
                    tx.tax,
                    tx.total_final,
                    `"${tx.payment_method.toUpperCase()}"`,
                    tx.is_voided ? 'VOID' : 'OK',
                  ].join(','));
                });
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `laporan-transaksi-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <span>📊</span> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">Waktu</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">Invoice</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">Kasir</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">Belum ada transaksi.</td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-slate-50/80 transition-colors ${tx.is_voided ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{new Date(tx.created_at).toLocaleDateString('id-ID')}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleTimeString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{tx.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-700">{tx.cashier_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-black ${tx.is_voided ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {formatRp(tx.total_final)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tx.is_voided ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Void
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Sukses
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!tx.is_voided && (
                          <button
                            onClick={() => { setVoidModal(tx); setVoidPassword(''); setVoidError(''); }}
                            className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {recentTransactions.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-slate-500">
                Menampilkan{' '}
                <span className="font-bold text-slate-700">
                  {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, recentTransactions.length)}
                </span>{' '}
                dari <span className="font-bold text-slate-700">{recentTransactions.length}</span> transaksi
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Sebelumnya
                </button>
                <span className="px-3 text-sm font-bold text-slate-600 tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {voidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-red-50">
              <h3 className="text-lg font-black text-red-800">Void Transaksi</h3>
              <p className="text-xs text-red-600 mt-1 font-mono">{voidModal.invoice_number} · {formatRp(voidModal.total_final)}</p>
            </div>
            <form onSubmit={handleVoidSubmit}>
              <div className="p-6 space-y-3">
                <p className="text-sm text-slate-600">Masukkan password Owner untuk konfirmasi. Stok produk akan dikembalikan otomatis.</p>
                {voidError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{voidError}</div>
                )}
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Password Owner"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-red-400 font-medium"
                  value={voidPassword}
                  onChange={(e) => setVoidPassword(e.target.value)}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setVoidModal(null)} className="px-4 py-2.5 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-200">Batal</button>
                <button type="submit" disabled={voidLoading} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg disabled:opacity-60">
                  {voidLoading ? 'Memproses...' : 'Konfirmasi Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
