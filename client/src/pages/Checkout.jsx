import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncProductsToLocal, getLocalProducts, decrementLocalStock, queueOfflineTransaction } from '../services/syncService';
import { fuzzyFilterProducts } from '../utils/fuzzyMatch';
import ReceiptTemplate from '../components/ReceiptTemplate';
import { useToast } from '../components/Toast';
import { API_BASE_URL } from '../config';

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');

const getGradient = (str) => {
  const gradients = [
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
};

const getCategoryEmoji = (categoryId) => {
  const map = { 1: '🥤', 2: '🍚', 3: '🍿', 4: '📦' };
  return map[categoryId] || '🛍️';
};

const Checkout = () => {
  const { api, shift, user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [qrisImageUrl, setQrisImageUrl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanError, setScanError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [syncing, setSyncing] = useState(true);

  const [cart, setCart] = useState([]);
  const [mobileTab, setMobileTab] = useState('katalog'); // 'katalog' | 'keranjang'

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState('nominal'); 
  const [amountPaid, setAmountPaid] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      setSyncing(true);
      const synced = await syncProductsToLocal(api);
      if (synced) {
        setProducts(synced.products);
        setCategories(synced.categories);
        setAllowNegativeStock(synced.allowNegativeStock);
        setQrisImageUrl(synced.qrisImageUrl);
      } else {
        const local = await getLocalProducts();
        setProducts(local.products);
        setCategories(local.categories);
        setAllowNegativeStock(local.allowNegativeStock);
        setQrisImageUrl(local.qrisImageUrl);
      }
      setSyncing(false);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (cart.length === 0 && mobileTab === 'keranjang') {
      setMobileTab('katalog');
    }
  }, [cart.length, mobileTab]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category_id === parseInt(activeCategory));
    }
    if (searchQuery.trim()) {
      result = fuzzyFilterProducts(result, searchQuery);
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  const addToCart = useCallback((product) => {
    if (product.stock <= 0 && !allowNegativeStock) {
      showToast(`Stok "${product.name}" habis.`, 'warning');
      return false;
    }
    let added = true;
    setCart((prev) => {
      const inCart = prev.find((item) => item.product_id === product.id);
      if (inCart) {
        if (inCart.quantity >= product.stock && !allowNegativeStock) {
          added = false;
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          selling_price: product.selling_price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
    if (!added) {
      showToast(`Stok "${product.name}" tidak mencukupi.`, 'warning');
      return false;
    }
    setScanError('');
    return true;
  }, [allowNegativeStock, showToast]);

  const handleBarcodeScan = useCallback((code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const product = products.find((p) => p.sku_barcode === trimmed);
    if (product) {
      if (addToCart(product)) {
        setSearchQuery('');
      }
    } else {
      setScanError(`Barcode "${trimmed}" tidak ditemukan.`);
      setTimeout(() => setScanError(''), 2500);
    }
  }, [products, addToCart]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(searchQuery);
    }
  };

  const updateQty = (productId, delta) => {
    const item = cart.find((i) => i.product_id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty > item.stock && !allowNegativeStock && delta > 0) {
      showToast(`Stok "${item.name}" tidak mencukupi.`, 'warning');
      return;
    }
    setCart((prev) =>
      prev
        .map((row) => {
          if (row.product_id !== productId) return row;
          const nextQty = row.quantity + delta;
          if (nextQty <= 0) return null;
          return { ...row, quantity: nextQty };
        })
        .filter(Boolean)
    );
  };

  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method !== 'cash') setAmountPaid('');
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.product_id !== productId));

  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const discountValue = useMemo(() => {
    const raw = parseInt(discountInput.replace(/\D/g, ''), 10) || 0;
    if (discountType === 'persen') return Math.round(subtotal * Math.min(raw, 100) / 100);
    return Math.min(raw, subtotal);
  }, [discountInput, discountType, subtotal]);

  const afterDiscount = subtotal - discountValue;
  const taxValue = Math.round(afterDiscount * 0.11);
  const totalFinal = afterDiscount + taxValue;

  const amountPaidNum = parseInt(amountPaid.replace(/\D/g, ''), 10) || 0;
  const changeAmount = Math.max(0, amountPaidNum - totalFinal);

  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitError(null);
    const paid = paymentMethod === 'cash' ? amountPaidNum : totalFinal;
    if (paymentMethod === 'cash' && paid < totalFinal) return;
    const change = paymentMethod === 'cash' ? Math.max(0, paid - totalFinal) : 0;

    const txData = {
      shift_id: shift?.id,
      items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, selling_price: item.selling_price })),
      subtotal, discount: discountValue, tax: taxValue, total_final: totalFinal,
      payment_method: paymentMethod, amount_paid: paid,
      amount_change: change,
    };

    try {
      const res = await api.post('/transactions', txData);
      for (const item of cart) await decrementLocalStock(item.product_id, item.quantity);
      const local = await getLocalProducts();
      setProducts(local.products);
      const receiptData = { invoice: res.data.invoiceNumber, cashier_name: user?.name, ...txData, change: txData.amount_change };
      setShowReceipt(receiptData);
      setCart([]); setDiscountInput(''); setAmountPaid(''); setMobileTab('katalog');
      setTimeout(() => window.print(), 100);
    } catch (error) {
      const serverMsg = error?.response?.data?.message;
      // Jika server menolak karena tidak ada shift, tampilkan error — JANGAN simpan offline
      if (serverMsg && serverMsg.includes('shift')) {
        setSubmitError(serverMsg);
        return;
      }
      // Error lain (offline / network) → simpan ke antrean offline
      await queueOfflineTransaction(txData);
      window.dispatchEvent(new CustomEvent('offline-queue-updated'));
      for (const item of cart) await decrementLocalStock(item.product_id, item.quantity);
      const local = await getLocalProducts();
      setProducts(local.products);
      const receiptData = { invoice: `OFFLINE-${Date.now()}`, cashier_name: user?.name, ...txData, change: txData.amount_change, isOffline: true };
      setShowReceipt(receiptData);
      setCart([]); setDiscountInput(''); setAmountPaid(''); setMobileTab('katalog');
      setTimeout(() => window.print(), 100);
    }
  };

  const cashShortcuts = [
    { label: 'Uang Pas', value: totalFinal },
    { label: '2.000', value: 2000 },
    { label: '5.000', value: 5000 },
    { label: '10.000', value: 10000 },
    { label: '20.000', value: 20000 },
    { label: '50.000', value: 50000 },
    { label: '100.000', value: 100000 },
  ];

  /* ── Receipt Modal ── */
  if (showReceipt) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
        <div className="w-full max-w-[380px] rounded-[24px] overflow-hidden" style={{ backgroundColor: '#FFF', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
          <div className="px-6 pt-8 pb-6 text-center bg-[#0F172A]">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">✅</div>
            <h2 className="text-base font-bold tracking-[3px] uppercase text-white">Transaksi Berhasil</h2>
            <p className="text-xs mt-2 font-mono" style={{ color: '#94A3B8' }}>{showReceipt.invoice}</p>
            {showReceipt.isOffline && (
              <p className="text-[10px] mt-2 px-3 py-1 rounded-full font-bold inline-block" style={{ backgroundColor: '#F59E0B', color: '#FFF' }}>
                ⚡ TERSIMPAN OFFLINE
              </p>
            )}
          </div>
          <div className="w-full h-4 -mt-1" style={{ background: `radial-gradient(circle at 10px -5px, #FFFFFF 12px, #0F172A 13px)`, backgroundSize: '20px 20px' }} />
          <div className="px-8 pb-8 pt-2 space-y-3">
            {[
              { l: 'Total Belanja', v: formatRp(showReceipt.total_final) },
              { l: 'Uang Dibayar', v: formatRp(showReceipt.amount_paid) },
              { l: 'Kembalian', v: formatRp(showReceipt.change), bold: true },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center py-3" style={{ borderBottom: i < 2 ? '1px dashed #E2E8F0' : 'none' }}>
                <span className="text-sm font-medium" style={{ color: '#64748B' }}>{r.l}</span>
                <span className={`font-mono ${r.bold ? 'text-2xl font-bold text-emerald-600' : 'text-base font-bold text-slate-900'}`}>{r.v}</span>
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={() => window.print()} className="w-1/3 py-4 rounded-[16px] text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-transform active:scale-95">
                🖨️ Cetak
              </button>
              <button onClick={() => setShowReceipt(null)} className="flex-1 py-4 rounded-[16px] text-sm font-bold text-white shadow-lg transition-transform active:scale-95 bg-blue-600 hover:bg-blue-700">
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
        
        {/* Hidden Thermal Receipt for Printing */}
        <ReceiptTemplate receipt={showReceipt} />
      </div>
    );
  }

  const isCartVisible = cart.length > 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F8FAFC] relative">
      
      {/* ══════ KOLOM KIRI: Produk ══════ */}
      {/* Di mobile: hidden kalau tab keranjang. Tampil 100% width jika keranjang kosong */}
      <div 
        className={`${mobileTab === 'keranjang' ? 'hidden' : 'flex'} md:flex flex-col h-full transition-all duration-300 ease-in-out p-4 md:p-6 w-full flex-1 min-w-0`}
      >
        {/* Search Bar */}
        <div className="mb-4 md:mb-6 relative group w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl text-slate-400">🔍</span>
          <input
            type="text"
            className="w-full pl-12 pr-4 py-3 md:py-4 rounded-full text-sm md:text-base outline-none transition-all border border-slate-200 focus:border-blue-500"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', color: '#0F172A' }}
            placeholder="Cari produk atau scan barcode..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (scanError) setScanError(''); }}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          {scanError && (
            <div className="absolute left-0 right-0 top-full mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 shadow-sm z-10">
              ⚠️ {scanError}
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 overflow-x-auto pb-2 w-full snap-x" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setActiveCategory('all')}
            className={`snap-start px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-sm border whitespace-nowrap flex-shrink-0 ${activeCategory === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            🔥 Semua
          </button>
          {categories.map(cat => (
             <button
             key={cat.id}
             onClick={() => setActiveCategory(String(cat.id))}
             className={`snap-start px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-sm flex items-center gap-2 border whitespace-nowrap flex-shrink-0 ${activeCategory === String(cat.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
           >
             <span>{getCategoryEmoji(cat.id)}</span> {cat.name}
           </button>
          ))}
        </div>

        {/* Product Grid */}
        {/* Perbaikan layout grid: pada md (tablet portrait) gunakan grid-cols-2 agar produk lebih lebar dan proporsional */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-6 pr-1 md:pr-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {syncing ? (
             <div className="flex justify-center items-center h-40 text-slate-400">⏳ Sinkronisasi Katalog...</div>
          ) : filteredProducts.length === 0 ? (
             <div className="flex justify-center items-center h-40 text-slate-400 font-bold">🕵️ Produk tidak ditemukan.</div>
          ) : (
            <div className={`grid grid-cols-2 lg:grid-cols-3 ${!isCartVisible ? 'xl:grid-cols-5' : 'xl:grid-cols-3'} gap-3 md:gap-4 lg:gap-5`}>
              {filteredProducts.map(product => {
                const outOfStock = product.stock <= 0 && !allowNegativeStock;
                const inCart = cart.find(c => c.product_id === product.id);

                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (outOfStock) {
                        showToast(`Stok "${product.name}" habis.`, 'warning');
                        return;
                      }
                      addToCart(product);
                    }}
                    className="flex flex-col text-left transition-all relative rounded-2xl md:rounded-[20px] overflow-hidden group border border-slate-100"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', opacity: outOfStock ? 0.5 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="w-full h-28 md:h-36 relative flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden" style={{ background: getGradient(product.name) }}>
                      {product.image_url ? (
                        <img src={`${API_BASE_URL}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl drop-shadow-md">{getCategoryEmoji(product.category_id)}</span>
                      )}
                      {inCart && (
                        <div className="absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 md:w-8 md:h-8 bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold border border-white/20 shadow-lg animate-bounce">
                          {inCart.quantity}
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4 bg-white flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 mb-1 truncate">{product.sku_barcode}</p>
                        <h3 className="text-xs md:text-sm font-bold text-slate-800 leading-tight mb-2 line-clamp-2">{product.name}</h3>
                      </div>
                      <div className="flex flex-col lg:flex-row lg:items-end justify-between mt-auto gap-2 lg:gap-0">
                        <p className="text-sm md:text-base font-black text-blue-600 leading-none">{formatRp(product.selling_price)}</p>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 self-start lg:self-auto leading-none">
                          {outOfStock ? 'Habis' : `Stok: ${product.stock}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════ KOLOM KANAN: Keranjang & Pembayaran ══════ */}
      {/* Mobile: Absolute fullscreen. Desktop: Side panel */}
      {/* Perbaikan Lebar Tablet: menggunakan md:w-[320px] lg:w-[400px] xl:w-[450px] agar kiri tidak kekecilan */}
      {isCartVisible && (
        <div 
          className={`${mobileTab === 'katalog' ? 'hidden' : 'flex'} md:flex flex-col absolute md:relative inset-0 z-30 md:z-auto bg-white md:bg-transparent h-full md:py-6 md:pr-6 md:pl-0 w-full md:w-[320px] lg:w-[400px] xl:w-[450px] shrink-0 transition-all`}
        >
          {/* Perbaikan Mobile: Gunakan single scroll view (overflow-y-auto) agar tidak terpotong (fixed bottom off-screen) */}
          <div className="flex flex-col h-full w-full bg-white md:rounded-[24px] overflow-y-auto relative shadow-2xl md:shadow-[0_10px_40px_rgba(0,0,0,0.06)] md:border border-slate-200/60">
            
            {/* Header Keranjang */}
            <div className="px-5 py-4 bg-white md:z-10 flex items-center justify-between border-b border-slate-100 shadow-sm md:shadow-none shrink-0 sticky top-0 md:static">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMobileTab('katalog')}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  Keranjang <span className="bg-slate-900 text-white text-xs px-2.5 py-0.5 rounded-full">{cart.length}</span>
                </h2>
              </div>
              <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                Kosongkan
              </button>
            </div>

            {/* List Barang (Scrollable di desktop, mengalir di mobile) */}
            <div className="flex-1 p-4 md:p-5 space-y-3 bg-slate-50">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 overflow-hidden" style={{ background: getGradient(item.name) }}>
                    {(() => {
                      const p = products.find(p => p.id === item.product_id);
                      if (p?.image_url) return <img src={`${API_BASE_URL}${p.image_url}`} alt={item.name} className="w-full h-full object-cover" />;
                      return getCategoryEmoji(p?.category_id);
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate mb-1">{item.name}</p>
                    <p className="text-sm font-black text-blue-600">{formatRp(item.selling_price)}</p>
                  </div>
                  {/* Qty Controls */}
                  <div className="flex items-center bg-slate-100 rounded-full p-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Kurangi ${item.name}`}
                      onClick={() => updateQty(item.product_id, -1)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 font-bold hover:text-red-500 text-xl"
                    >
                      −
                    </button>
                    <span className="text-sm font-black text-slate-800 min-w-[2rem] text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Tambah ${item.name}`}
                      onClick={() => updateQty(item.product_id, 1)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 font-bold hover:text-blue-600 text-xl"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Area Pembayaran (Fixed Bottom di desktop, normal flow di mobile) */}
            <div className="bg-white px-5 py-5 border-t border-slate-100 md:z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] shrink-0">
              
              {/* Calculator Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 md:p-5 mb-4 border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Diskon</span>
                  <div className="flex items-center gap-2">
                     <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                        <button onClick={() => setDiscountType('nominal')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${discountType === 'nominal' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Rp</button>
                        <button onClick={() => setDiscountType('persen')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${discountType === 'persen' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>%</button>
                     </div>
                     <input type="text" className="w-24 bg-white px-3 py-1.5 rounded-lg text-sm font-bold outline-none text-right border border-slate-200 focus:border-blue-400" placeholder="0" value={discountInput} onChange={(e) => setDiscountInput(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                
                <div className="space-y-1.5 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-mono text-slate-800">{formatRp(subtotal)}</span></div>
                  {discountValue > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span className="font-mono">-{formatRp(discountValue)}</span></div>}
                  <div className="flex justify-between"><span>PPN 11%</span><span className="font-mono text-slate-800">{formatRp(taxValue)}</span></div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-end justify-between">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total</span>
                  <span className="text-2xl md:text-3xl font-black text-blue-600 font-mono tracking-tighter">{formatRp(totalFinal)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-xl mb-4">
                <button type="button" onClick={() => selectPaymentMethod('cash')} className={`py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${paymentMethod === 'cash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>💵 Tunai</button>
                <button type="button" onClick={() => selectPaymentMethod('qris')} className={`py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${paymentMethod === 'qris' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>📱 QRIS</button>
                <button type="button" onClick={() => selectPaymentMethod('transfer')} className={`py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>🏦 Transfer</button>
              </div>

              {paymentMethod === 'cash' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {cashShortcuts.map(s => (
                      <button key={s.label} onClick={() => setAmountPaid(String(s.value))} className={`py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${amountPaidNum === s.value ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-inner' : 'bg-white border-slate-200 text-slate-600'}`}>{s.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-stretch">
                    <div className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-2 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diterima</span>
                      <input type="text" className="w-full text-lg md:text-xl font-black text-slate-800 bg-transparent outline-none mt-0.5" placeholder="Rp 0" value={amountPaidNum ? amountPaidNum.toLocaleString('id-ID') : ''} onChange={(e) => setAmountPaid(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    {amountPaidNum >= totalFinal && totalFinal > 0 && (
                      <div className="bg-emerald-50 px-4 md:px-5 rounded-xl flex flex-col items-center justify-center border border-emerald-200 text-emerald-700 min-w-[80px]">
                        <span className="text-[10px] font-bold uppercase mb-0.5">Kembali</span>
                        <span className="text-base md:text-lg font-black font-mono">{formatRp(changeAmount).replace('Rp ', '')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : paymentMethod === 'qris' ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center space-y-3">
                  {qrisImageUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={`${API_BASE_URL}${qrisImageUrl}`}
                        alt="QRIS Toko"
                        className="w-40 h-40 object-contain bg-white rounded-xl p-2 shadow-sm border border-blue-100"
                      />
                      <p className="text-sm font-bold text-blue-900">Scan QR Code di atas untuk bayar</p>
                      <p className="text-xs text-blue-700">Total: {formatRp(totalFinal)}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 bg-white p-2 rounded-lg shadow-sm">
                        <div className="w-full h-full bg-slate-800" style={{ clipPath: 'polygon(0% 0%, 30% 0%, 30% 30%, 0% 30%, 0% 0%, 70% 0%, 100% 0%, 100% 30%, 70% 30%, 70% 0%, 70% 70%, 100% 70%, 100% 100%, 70% 100%, 70% 70%, 0% 70%, 30% 70%, 30% 100%, 0% 100%, 0% 70%, 40% 40%, 60% 40%, 60% 60%, 40% 60%, 40% 40%)' }} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-blue-900">QR belum diatur Owner</p>
                        <p className="text-xs text-blue-700">Total: {formatRp(totalFinal)}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-blue-800 font-medium">
                    Setelah pelanggan bayar via QRIS, tekan tombol konfirmasi di bawah.
                  </p>
                </div>
              ) : (
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center space-y-2">
                  <p className="text-sm font-bold text-violet-900">Transfer Bank</p>
                  <p className="text-xs text-violet-700 leading-relaxed">
                    Pastikan pembayaran transfer dari pelanggan sudah masuk sebelum menyelesaikan transaksi.
                  </p>
                  <p className="text-lg font-black text-violet-900 font-mono">{formatRp(totalFinal)}</p>
                </div>
              )}

              {submitError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span>{submitError}</span>
                </div>
              )}

              {paymentMethod === 'qris' ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-4 mt-5 rounded-xl text-sm md:text-base font-black text-white transition-all uppercase tracking-wide shadow-lg bg-emerald-600 hover:bg-emerald-700"
                  style={{ boxShadow: '0 10px 25px rgba(5,150,105,0.35)', minHeight: '52px' }}
                >
                  Konfirmasi Pembayaran Berhasil ✓
                </button>
              ) : paymentMethod === 'transfer' ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-4 mt-5 rounded-xl text-sm md:text-base font-black text-white transition-all uppercase tracking-wide shadow-lg bg-violet-600 hover:bg-violet-700"
                  style={{ boxShadow: '0 10px 25px rgba(124,58,237,0.35)', minHeight: '52px' }}
                >
                  Konfirmasi Transfer ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-4 mt-5 rounded-xl text-sm md:text-base font-black text-white transition-all uppercase tracking-wide shadow-lg"
                  style={{
                    backgroundColor: amountPaidNum < totalFinal ? '#CBD5E1' : '#0F172A',
                    cursor: amountPaidNum < totalFinal ? 'not-allowed' : 'pointer',
                    boxShadow: amountPaidNum < totalFinal ? 'none' : '0 10px 25px rgba(15,23,42,0.3)',
                    minHeight: '52px',
                  }}
                  disabled={amountPaidNum < totalFinal}
                >
                  {amountPaidNum < totalFinal ? 'Uang Kurang' : 'Bayar 🚀'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Floating Action Button (View Cart) ── */}
      {isCartVisible && mobileTab === 'katalog' && (
        <div className="md:hidden absolute bottom-6 left-0 right-0 px-4 flex justify-center z-20">
          <button
            onClick={() => setMobileTab('keranjang')}
            className="bg-slate-900 text-white rounded-2xl px-5 py-4 flex items-center shadow-2xl shadow-slate-900/40 w-full max-w-sm justify-between transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">{cart.length}</span>
              <span className="font-bold text-sm tracking-wide">Lihat Keranjang</span>
            </div>
            <span className="font-mono font-black text-lg text-emerald-400">{formatRp(subtotal)}</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default Checkout;
