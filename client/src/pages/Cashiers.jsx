import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const PIN_REGEX = /^\d{6}$/;

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const PinInput = ({ value, onChange, label, error }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      autoComplete="off"
      placeholder="••••••"
      className={`w-full mt-1.5 px-4 py-3 rounded-xl border text-center text-xl font-black tracking-[0.5em] outline-none transition-all ${
        error ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    />
    {error && <p className="text-xs font-semibold text-red-500 mt-1.5">{error}</p>}
    <p className="text-[10px] text-slate-400 mt-1">{value.length}/6 digit</p>
  </div>
);

const Cashiers = () => {
  const { api } = useAuth();
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', name: '', pin: '' });
  const [addErrors, setAddErrors] = useState({});

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');

  const fetchCashiers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cashiers');
      setCashiers(res.data);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  const validatePin = (pin) => {
    if (!pin) return 'PIN wajib diisi';
    if (!PIN_REGEX.test(pin)) return 'PIN harus tepat 6 digit angka';
    return '';
  };

  const handleOpenAdd = () => {
    setAddForm({ username: '', name: '', pin: '' });
    setAddErrors({});
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!addForm.username.trim()) errors.username = 'Username wajib diisi';
    if (!addForm.name.trim()) errors.name = 'Nama wajib diisi';
    const pinErr = validatePin(addForm.pin);
    if (pinErr) errors.pin = pinErr;

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/cashiers', addForm);
      setIsAddModalOpen(false);
      await fetchCashiers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menambahkan kasir';
      if (msg.toLowerCase().includes('username')) {
        setAddErrors({ username: msg });
      } else {
        setAddErrors({ general: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReset = (cashier) => {
    setSelectedCashier(cashier);
    setResetPin('');
    setResetError('');
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const pinErr = validatePin(resetPin);
    if (pinErr) {
      setResetError(pinErr);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/cashiers/${selectedCashier.id}`, { pin: resetPin });
      setIsResetModalOpen(false);
      await fetchCashiers();
    } catch (error) {
      setResetError(error.response?.data?.message || 'Gagal reset PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cashier) => {
    const action = cashier.is_active ? 'menonaktifkan' : 'mengaktifkan';
    if (!window.confirm(`Yakin ingin ${action} kasir "${cashier.name}"?`)) return;

    try {
      await api.put(`/cashiers/${cashier.id}`, { is_active: !cashier.is_active });
      await fetchCashiers();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengubah status kasir');
    }
  };

  const filteredCashiers = cashiers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Manajemen Kasir</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola akun kasir, PIN login, dan status aktif.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border border-slate-200 focus:border-blue-500 shadow-sm"
                placeholder="Cari nama atau username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              + Kasir Baru
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Kasir', value: cashiers.length, icon: '👥', color: 'blue' },
            { label: 'Aktif', value: cashiers.filter((c) => c.is_active).length, icon: '✅', color: 'emerald' },
            { label: 'Nonaktif', value: cashiers.filter((c) => !c.is_active).length, icon: '🚫', color: 'slate' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
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
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Kasir</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Username</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Bergabung</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCashiers.map((cashier) => (
                    <tr key={cashier.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {cashier.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-slate-800">{cashier.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          @{cashier.username}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-500">{formatDate(cashier.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            cashier.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cashier.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {cashier.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenReset(cashier)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors"
                          >
                            🔑 Reset PIN
                          </button>
                          <button
                            onClick={() => handleToggleStatus(cashier)}
                            className={`text-[10px] font-bold px-3 py-2 rounded-lg transition-colors ${
                              cashier.is_active
                                ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {cashier.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCashiers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center">
                        <span className="text-4xl block mb-3">👤</span>
                        <p className="text-slate-400 font-medium">Belum ada data kasir.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD CASHIER MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Tambah Kasir Baru</h3>
                <p className="text-xs text-slate-500 mt-0.5">Buat akun kasir dengan PIN 6 digit</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                {addErrors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                    {addErrors.general}
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    autoFocus
                    placeholder="Contoh: Budi Santoso"
                    className={`w-full mt-1.5 px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                      addErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                    }`}
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                  {addErrors.name && <p className="text-xs font-semibold text-red-500 mt-1">{addErrors.name}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: kasir2"
                    className={`w-full mt-1.5 px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                      addErrors.username ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                    }`}
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  />
                  {addErrors.username && <p className="text-xs font-semibold text-red-500 mt-1">{addErrors.username}</p>}
                </div>
                <PinInput
                  label="PIN Login (6 Digit)"
                  value={addForm.pin}
                  onChange={(val) => setAddForm({ ...addForm, pin: val })}
                  error={addErrors.pin}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PIN MODAL ── */}
      {isResetModalOpen && selectedCashier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Reset PIN</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCashier.name} (@{selectedCashier.username})</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center text-slate-500 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResetSubmit}>
              <div className="p-6">
                <PinInput
                  label="PIN Baru (6 Digit)"
                  value={resetPin}
                  onChange={setResetPin}
                  error={resetError}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Reset PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cashiers;
