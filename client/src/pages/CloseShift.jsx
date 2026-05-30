import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const formatRp = (value) =>
  'Rp ' + parseInt(value || 0, 10).toLocaleString('id-ID');

const CloseShift = () => {
  const [cashEnd, setCashEnd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { api, setShift, logout } = useAuth();
  const navigate = useNavigate();

  const handleCashChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCashEnd(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = parseInt(cashEnd.replace(/\D/g, ''), 10);
    if (isNaN(amount)) return setError('Masukkan nominal yang valid.');
    setLoading(true);
    try {
      const res = await api.post('/shifts/close', { cash_end: amount });
      setResult(res.data);
      setShift(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menutup shift.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    logout();
    navigate('/login');
  };

  /* ── Z-Report Result ── */
  if (result) {
    const selisih = result.selisih;
    const isPositive = selisih > 0;
    const isNegative = selisih < 0;

    let selisihBg, selisihColor, selisihBorder, selisihLabel;
    if (isPositive) {
      selisihBg = '#C4EECE'; selisihColor = '#002107'; selisihBorder = '#146C2E'; selisihLabel = '📈 Surplus';
    } else if (isNegative) {
      selisihBg = '#F9DEDC'; selisihColor = '#410E0B'; selisihBorder = '#B3261E'; selisihLabel = '📉 Minus';
    } else {
      selisihBg = '#F1F3F4'; selisihColor = '#49454F'; selisihBorder = '#E1E3E1'; selisihLabel = '✅ Cocok';
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F8F9FA' }}>
        <div
          className="w-full max-w-[420px] rounded-[16px] overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0px 2px 6px 2px rgba(0,0,0,0.05), 0px 1px 2px 0px rgba(0,0,0,0.10)' }}
        >
          {/* Receipt Header */}
          <div className="px-8 pt-8 pb-6 text-center" style={{ backgroundColor: '#1C1B1F' }}>
            <p className="text-3xl mb-2">🧾</p>
            <h2 className="text-base font-bold tracking-[3px] uppercase text-white">Z-Report Shift</h2>
            <p className="text-xs mt-1" style={{ color: '#74777F' }}>
              {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>

          {/* Jagged edge */}
          <div className="w-full h-4 -mt-px" style={{
            background: `radial-gradient(circle at 10px -5px, #FFFFFF 12px, #1C1B1F 13px)`,
            backgroundSize: '20px 20px',
          }} />

          {/* Receipt Body */}
          <div className="px-8 pb-8">
            <div className="space-y-0">
              {[
                { label: 'Modal Awal', value: formatRp(result.shift.cash_start) },
                { label: 'Total Kas Sistem', value: formatRp(result.shift.total_expected) },
                { label: 'Uang Fisik di Laci', value: formatRp(result.shift.cash_end) },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-4"
                  style={{ borderBottom: '1px dashed #E1E3E1' }}
                >
                  <span className="text-sm font-medium" style={{ color: '#49454F' }}>{row.label}</span>
                  <span className="text-sm font-bold font-mono" style={{ color: '#1C1B1F' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Selisih Result */}
            <div
              className="flex justify-between items-center p-4 rounded-[12px] mt-5 mb-8"
              style={{ backgroundColor: selisihBg, border: `1.5px solid ${selisihBorder}` }}
            >
              <span className="font-bold text-sm" style={{ color: selisihColor }}>{selisihLabel}</span>
              <span className="font-mono font-bold text-lg" style={{ color: selisihColor }}>
                {isPositive ? '+' : ''}{formatRp(selisih)}
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-4 rounded-[12px] text-sm font-bold text-white transition-all duration-200"
              style={{ backgroundColor: '#1C1B1F', minHeight: '52px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2D2D2D'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1C1B1F'}
            >
              Selesai & Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Blind Close Form ── */
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div
        className="w-full max-w-[440px] rounded-[16px] p-8"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.05), 0px 1px 2px 0px rgba(0,0,0,0.10)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: '#F9DEDC' }}
          >
            <span className="text-4xl">🪙</span>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#1C1B1F' }}>
            Tutup Shift
          </h1>
          <p className="text-sm text-center" style={{ color: '#49454F' }}>
            Proses <strong>Blind Close</strong> — hitung uang fisik terlebih dahulu.
          </p>
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-3 p-4 mb-6 rounded-[12px] text-sm"
          style={{ backgroundColor: '#FFF3E0', color: '#8B5E00', border: '1px solid #FFE0B2' }}
        >
          <span className="text-xl">⚠️</span>
          <p className="leading-relaxed font-medium">
            Hitung uang di laci kasir dan masukkan jumlahnya di bawah ini. <strong>Jangan lihat referensi dari sistem.</strong>
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2.5 p-3.5 mb-5 rounded-[12px] text-sm font-medium"
            style={{ backgroundColor: '#F9DEDC', color: '#B3261E', border: '1px solid #F2B8B5' }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#49454F' }}>
              Total Uang Fisik
            </label>
            <div
              className="flex items-center gap-2 rounded-[16px] p-5"
              style={{ backgroundColor: '#F8F9FA', border: '1.5px solid #E1E3E1' }}
            >
              <span className="text-2xl font-bold" style={{ color: '#74777F' }}>Rp</span>
              <input
                type="text"
                className="flex-1 text-4xl font-bold bg-transparent outline-none w-full"
                style={{ color: '#1C1B1F' }}
                placeholder="0"
                value={cashEnd}
                onChange={handleCashChange}
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-[12px] text-base font-bold text-white transition-all duration-200"
            style={{
              backgroundColor: (!cashEnd || loading) ? '#AAAEAF' : '#B3261E',
              boxShadow: (!cashEnd || loading) ? 'none' : '0 2px 8px rgba(179,38,30,0.25)',
              cursor: (!cashEnd || loading) ? 'not-allowed' : 'pointer',
              minHeight: '52px',
            }}
            onMouseEnter={(e) => { if (cashEnd && !loading) e.target.style.backgroundColor = '#8C1D18'; }}
            onMouseLeave={(e) => { if (cashEnd && !loading) e.target.style.backgroundColor = '#B3261E'; }}
            disabled={!cashEnd || loading}
          >
            {loading ? '⏳ Memproses...' : '🔒 Submit Tutup Shift'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CloseShift;
