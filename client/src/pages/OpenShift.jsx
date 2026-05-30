import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OpenShift = () => {
  const [cashStart, setCashStart] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { api, setShift, user } = useAuth();
  const navigate = useNavigate();

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setError('');
    const amount = parseInt(cashStart.replace(/\D/g, ''), 10);
    if (!amount || amount < 0) return setError('Masukkan nominal modal awal yang valid.');
    setLoading(true);
    try {
      const res = await api.post('/shifts/open', { cash_start: amount });
      setShift(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuka shift. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCashChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCashStart(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
  };

  const cashRaw = parseInt(cashStart.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div
        className="w-full max-w-[440px] rounded-[16px] p-8"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.05), 0px 1px 2px 0px rgba(0,0,0,0.10)',
        }}
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: '#C4EECE' }}
          >
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#1C1B1F' }}>
            Buka Shift Kasir
          </h1>
          <p className="text-sm text-center" style={{ color: '#49454F' }}>
            Halo, <strong style={{ color: '#1C1B1F' }}>{user?.name}</strong>! Masukkan modal awal untuk memulai.
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

        <form onSubmit={handleOpenShift}>
          {/* Nominal Input - Headline Style */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#49454F' }}>
              Modal Awal (Uang di Laci)
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
                value={cashStart}
                onChange={handleCashChange}
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#49454F' }}>
              Pilihan Cepat
            </p>
            <div className="flex flex-wrap gap-2">
              {[100000, 200000, 300000, 500000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashStart(amt.toLocaleString('id-ID'))}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
                  style={
                    cashRaw === amt
                      ? { backgroundColor: '#D3E3FD', color: '#041E49', border: '1.5px solid #0056D2' }
                      : { backgroundColor: '#F8F9FA', color: '#49454F', border: '1.5px solid #E1E3E1' }
                  }
                  onMouseEnter={(e) => { if (cashRaw !== amt) e.target.style.backgroundColor = '#E8EAED'; }}
                  onMouseLeave={(e) => { if (cashRaw !== amt) e.target.style.backgroundColor = '#F8F9FA'; }}
                >
                  {amt.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6" style={{ borderTop: '1px solid #E1E3E1' }} />

          <button
            type="submit"
            className="w-full py-4 rounded-[12px] text-base font-bold text-white transition-all duration-200"
            style={{
              backgroundColor: (!cashStart || loading) ? '#AAAEAF' : '#146C2E',
              boxShadow: (!cashStart || loading) ? 'none' : '0 2px 8px rgba(20,108,46,0.25)',
              cursor: (!cashStart || loading) ? 'not-allowed' : 'pointer',
              minHeight: '52px',
            }}
            onMouseEnter={(e) => { if (cashStart && !loading) e.target.style.backgroundColor = '#0D5523'; }}
            onMouseLeave={(e) => { if (cashStart && !loading) e.target.style.backgroundColor = '#146C2E'; }}
            disabled={!cashStart || loading}
          >
            {loading ? '⏳ Membuka Shift...' : '✅ Buka Shift Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OpenShift;
