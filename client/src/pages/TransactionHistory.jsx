import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');

const paymentLabel = (method) => {
  if (method === 'qris') return '📱 QRIS';
  if (method === 'transfer') return '🏦 Transfer';
  return '💵 Tunai';
};

const TransactionHistory = () => {
  const { api, shift } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!shift) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/shifts/transactions');
        setTransactions(res.data.transactions || []);
      } catch (error) {
        console.error('Error fetching shift transactions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [api, shift]);

  const filtered = transactions.filter(
    (tx) =>
      tx.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paymentLabel(tx.payment_method).includes(searchQuery)
  );

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_final, 0);

  if (!shift) {
    return (
      <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="text-xl font-black text-slate-800 mb-2">Shift Belum Dibuka</h2>
          <p className="text-sm text-slate-500 mb-6">Buka shift terlebih dahulu untuk melihat riwayat transaksi Anda.</p>
          <button
            onClick={() => navigate('/buka-shift')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
          >
            Buka Shift Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Riwayat Transaksi</h1>
            <p className="text-sm text-slate-500 mt-1">Transaksi shift aktif Anda · Modal awal {formatRp(shift.cash_start)}</p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-blue-500 shadow-sm"
              placeholder="Cari invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Transaksi</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{transactions.length} Nota</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Omzet Shift</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{formatRp(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm col-span-2 md:col-span-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shift Dimulai</p>
            <p className="text-sm font-bold text-slate-700 mt-2">
              {new Date(shift.start_time).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Waktu</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Invoice</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Item</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Metode</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{new Date(tx.created_at).toLocaleDateString('id-ID')}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleTimeString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {tx.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-slate-700">{tx.total_items}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600">{paymentLabel(tx.payment_method)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-800">{formatRp(tx.total_final)}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center">
                        <span className="text-4xl block mb-3">🧾</span>
                        <p className="text-slate-400 font-medium">Belum ada transaksi pada shift ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
