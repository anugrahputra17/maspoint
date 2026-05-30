import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NumericKeypad from '../components/NumericKeypad';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const inputClass =
  'w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white/80 border border-white/60 shadow-inner outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/20 focus:bg-white';

const Login = () => {
  const [method, setMethod] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (method === 'password') {
        res = await axios.post(`${API_URL}/auth/login`, { username, password });
      } else {
        res = await axios.post(`${API_URL}/auth/pin-login`, { username, pin });
      }
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinPress = (num) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => handlePinSubmit(newPin), 200);
      }
    }
  };

  const handlePinSubmit = async (currentPin) => {
    if (!username) return setError('Username wajib diisi terlebih dahulu.');
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/pin-login`, { username, pin: currentPin });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'PIN salah. Coba lagi.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const pinDots = Array(6).fill(null);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background — Stitch-style vibrant mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/50 blur-3xl" />
      <div className="absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="absolute -bottom-20 left-1/4 h-96 w-96 rounded-full bg-cyan-300/45 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="grid w-full max-w-[920px] overflow-hidden rounded-[28px] shadow-2xl shadow-indigo-900/25 md:grid-cols-[1fr_1.05fr]">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700/90 to-violet-800/95 p-8 text-white md:flex">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400 blur-2xl" />
              <div className="absolute bottom-8 left-4 h-32 w-32 rounded-full bg-pink-400 blur-2xl" />
            </div>
            <div className="relative">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-md ring-1 ring-white/30">
                LP
              </div>
              <h1 className="text-3xl font-black leading-tight tracking-tight">
                Lite<span className="text-cyan-300">POS</span>
              </h1>
              <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-indigo-100/90">
                Kasir cepat, laporan jelas — dirancang untuk UMKM modern.
              </p>
            </div>
            <ul className="relative space-y-3 text-sm text-indigo-100/85">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/25 text-xs">✓</span>
                Mode offline & sinkron otomatis
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/25 text-xs">✓</span>
                PIN kasir 6 digit
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-400/25 text-xs">✓</span>
                Dashboard owner real-time
              </li>
            </ul>
          </div>

          {/* Form card — glass */}
          <div className="bg-white/95 p-6 backdrop-blur-xl sm:p-8">
            {/* Mobile logo */}
            <div className="mb-6 flex items-center justify-center gap-2.5 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg">
                LP
              </div>
              <span className="text-xl font-black text-slate-900">
                Lite<span className="text-violet-600">POS</span>
              </span>
            </div>

            <div className="mb-5 text-center md:text-left">
              <h2 className="text-xl font-bold text-slate-900">Selamat datang</h2>
              <p className="mt-1 text-sm text-slate-500">Masuk untuk mulai shift kasir</p>
            </div>

            {/* Tabs */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1">
              <button
                type="button"
                onClick={() => { setMethod('password'); setError(''); setPin(''); }}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  method === 'password'
                    ? 'bg-white text-violet-700 shadow-md shadow-violet-500/10'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setMethod('pin'); setError(''); setPassword(''); }}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  method === 'pin'
                    ? 'bg-white text-violet-700 shadow-md shadow-violet-500/10'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                PIN Kasir
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">
                <span aria-hidden>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={method === 'password' ? handleLogin : (e) => e.preventDefault()}>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Username
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="contoh: kasir1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              {method === 'password' ? (
                <>
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`${inputClass} pr-11`}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-violet-600"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
                  >
                    {loading ? 'Memproses...' : 'Masuk ke Sistem'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="block text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                    PIN 6 digit
                  </label>

                  {/* Compact PIN dots */}
                  <div className="mx-auto flex max-w-[200px] justify-center gap-2 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2.5">
                    {pinDots.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-200 ${
                          i < pin.length
                            ? 'h-2.5 w-2.5 bg-violet-600 shadow-sm shadow-violet-400/50'
                            : 'h-2.5 w-2.5 border-2 border-violet-200 bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  <NumericKeypad
                    compact
                    onKeyPress={handlePinPress}
                    onDelete={() => setPin((prev) => prev.slice(0, -1))}
                    onClear={() => setPin('')}
                  />

                  {loading && (
                    <p className="text-center text-xs font-semibold text-violet-600">
                      Memverifikasi PIN...
                    </p>
                  )}
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-[11px] text-slate-400">
              LitePOS v1.0 · Sistem kasir UMKM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
