import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SalesTrendChart from '../components/SalesTrendChart';

/* ── Stat Widget Card ── */
const StatCard = ({ icon, label, value }) => (
  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-sm font-bold text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
    </div>
  </div>
);

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');

const DashboardHome = () => {
  const { user, shift, api } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === 'owner';
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    cashRevenue: 0,
    qrisRevenue: 0,
  });
  const [recentTx, setRecentTx] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        if (isOwner) {
          const [dashRes, trendRes] = await Promise.all([
            api.get('/reports/dashboard'),
            api.get('/reports/trend'),
          ]);
          setMetrics((prev) => ({ ...prev, ...dashRes.data.metrics, totalItemsSold: 0 }));
          setRecentTx(dashRes.data.recentTransactions?.slice(0, 5) || []);
          setTrend(trendRes.data.trend || []);
        } else if (user?.role === 'cashier') {
          const res = await api.get('/shifts/summary');
          if (res.data.metrics) {
            setMetrics((prev) => ({ ...prev, ...res.data.metrics }));
          }
          setRecentTx(res.data.recentTransactions || []);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err.message);
      }
    };
    fetchDashboard();
  }, [user, api, isOwner]);

  const subtitle = isOwner
    ? 'Berikut adalah ringkasan performa toko hari ini.'
    : shift
      ? 'Ringkasan penjualan shift aktif Anda.'
      : 'Buka shift untuk mulai melayani pelanggan.';

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-[#F8FAFC]">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            Halo, {user?.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 font-medium">{subtitle}</p>
        </div>

        {user?.role === 'cashier' && !shift && (
          <button
            onClick={() => navigate('/buka-shift')}
            className="px-6 py-3 rounded-full text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all hover:scale-105 flex items-center gap-2"
          >
            <span className="text-lg">🔓</span> Buka Shift Sekarang
          </button>
        )}
      </div>

      {shift && (
        <div
          className="rounded-[28px] p-8 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.3)',
          }}
        >
          <div className="absolute -top-24 -right-10 w-64 h-64 bg-blue-500 opacity-20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl" />

          <div className="flex items-center gap-5 relative z-10 mb-6 md:mb-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
              <span className="text-3xl">💼</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Shift Kasir Aktif</p>
              </div>
              <h2 className="text-2xl font-black text-white">Siap Melayani Pelanggan</h2>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Modal Awal: Rp {parseInt(shift.cash_start).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate('/kasir')}
              className="flex-1 md:flex-none px-8 py-3.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 flex justify-center items-center gap-2"
            >
              🛒 Ke Mesin Kasir
            </button>
            {user.role === 'cashier' && (
              <button
                onClick={() => navigate('/tutup-shift')}
                className="flex-1 md:flex-none px-6 py-3.5 rounded-xl text-sm font-bold bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all flex justify-center items-center gap-2"
              >
                🔒 Akhiri Shift
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-4'} gap-4 md:gap-6`}>
        {isOwner ? (
          <>
            <StatCard icon="💰" label="Total Penjualan" value={formatRp(metrics.totalRevenue)} />
            <StatCard icon="📈" label="Keuntungan Bersih" value={formatRp(metrics.totalProfit)} />
            <StatCard icon="🧾" label="Total Transaksi" value={`${metrics.totalTransactions} Nota`} />
            <StatCard icon="📦" label="Produk Terjual" value={`${metrics.totalItemsSold || metrics.totalTransactions} Item`} />
          </>
        ) : (
          <>
            <StatCard icon="💰" label="Penjualan Shift" value={formatRp(metrics.totalRevenue)} />
            <StatCard icon="🧾" label="Total Transaksi" value={`${metrics.totalTransactions} Nota`} />
            <StatCard icon="💵" label="Penjualan Tunai" value={formatRp(metrics.cashRevenue)} />
            <StatCard icon="📱" label="Penjualan QRIS" value={formatRp(metrics.qrisRevenue)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isOwner ? (
          <div className="lg:col-span-2">
            <SalesTrendChart data={trend} title="Statistik Pendapatan" />
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">Ringkasan Shift</h3>
            </div>
            <div className="flex-1 min-h-[200px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
              <div className="text-center">
                <span className="text-4xl grayscale opacity-30 mb-2 block">📊</span>
                <p className="text-sm font-bold text-slate-400">
                  {metrics.totalRevenue > 0
                    ? `Omzet: ${formatRp(metrics.totalRevenue)}`
                    : 'Belum ada transaksi pada shift ini'}
                </p>
                {metrics.totalItemsSold > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{metrics.totalItemsSold} produk terjual</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">Aktivitas Terakhir</h3>

          <div className="space-y-3">
            {recentTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <span className="text-3xl grayscale opacity-30 mb-2">⏳</span>
                <p className="text-xs font-bold text-slate-400">Belum ada transaksi</p>
              </div>
            ) : (
              recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {isOwner ? tx.cashier_name?.charAt(0).toUpperCase() : '🧾'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{tx.invoice_number}</p>
                      <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-800">{formatRp(tx.total_final)}</span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => navigate(isOwner ? '/laporan' : '/riwayat')}
            className="w-full mt-4 py-3 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            Lihat Semua Riwayat
          </button>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;
