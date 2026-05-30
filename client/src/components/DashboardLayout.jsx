import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processOfflineQueue, getPendingOfflineCount } from '../services/syncService';

/* ── Sidebar Nav Item (Dark Theme) ── */
const NavItem = ({ icon, label, active, onClick, badge, isCollapsed }) => (
  <button
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-300 text-left mb-1 group relative`}
    style={
      active
        ? { backgroundColor: '#1E293B', color: '#FFFFFF', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }
        : { backgroundColor: 'transparent', color: '#94A3B8' }
    }
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = '#1E293B'; e.currentTarget.style.color = '#F8FAFC'; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
  >
    <span className="text-xl w-6 text-center">{icon}</span>
    
    {!isCollapsed && (
      <span className="flex-1 whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>
    )}
    
    {(!isCollapsed && badge) && (
      <span
        className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
        style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}
      >
        {badge}
      </span>
    )}

    {isCollapsed && (
      <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    )}
  </button>
);

const DashboardLayout = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const refreshPendingCount = async () => {
    const count = await getPendingOfflineCount();
    setPendingOfflineCount(count);
  };

  const runOfflineSync = async () => {
    setSyncingOffline(true);
    const result = await processOfflineQueue(api);
    await refreshPendingCount();
    setSyncingOffline(false);
    if (result.synced > 0) {
      console.log(`[OfflineSync] ${result.synced} transaksi tertunda berhasil disinkronkan.`);
    } else if (result.error) {
      console.warn(`[OfflineSync] Masih gagal: ${result.error}`);
    }
    return result;
  };

  // Background Sync Worker (Bulk)
  useEffect(() => {
    refreshPendingCount();
    runOfflineSync();

    const handleOnline = () => {
      console.log('🌐 Koneksi pulih! Memulai sinkronisasi background...');
      runOfflineSync();
    };

    const handleOfflineQueueUpdate = () => refreshPendingCount();

    const interval = setInterval(refreshPendingCount, 30000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-queue-updated', handleOfflineQueueUpdate);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-queue-updated', handleOfflineQueueUpdate);
      clearInterval(interval);
    };
  }, [api]);

  const now = new Date();
  const greet = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Malam';

  const ownerNavItems = [
    { id: '/', icon: '🏠', label: 'Beranda' },
    { id: '/kasir', icon: '🛒', label: 'Kasir / POS' },
    { id: '/produk', icon: '📦', label: 'Produk' },
    { id: '/laporan', icon: '📊', label: 'Laporan' },
    { id: '/owner/cashiers', icon: '👥', label: 'Manajemen Kasir' },
    { id: '/pengaturan', icon: '⚙️', label: 'Pengaturan' },
  ];

  const cashierNavItems = [
    { id: '/', icon: '🏠', label: 'Beranda' },
    { id: '/kasir', icon: '🛒', label: 'Kasir / POS' },
    { id: '/riwayat', icon: '📋', label: 'Riwayat' },
  ];

  const navItems = user?.role === 'owner' ? ownerNavItems : cashierNavItems;

  const getPageTitle = () => {
    if (location.pathname === '/kasir') return 'Point of Sales (POS)';
    if (location.pathname === '/owner/cashiers') return 'Manajemen Kasir';
    if (location.pathname === '/produk') return 'Manajemen Stok';
    if (location.pathname === '/laporan') return 'Laporan Penjualan';
    if (location.pathname === '/riwayat') return 'Riwayat Transaksi';
    if (location.pathname === '/pengaturan') return 'Pengaturan Toko';
    return user?.name || 'Kasir';
  };

  const handleNavClick = (id) => {
    navigate(id);
    setIsMobileMenuOpen(false); // Close mobile menu after clicking
  };

  return (
    <div className="h-screen flex bg-[#F8FAFC] font-sans relative overflow-hidden">
      
      {/* ══════ MOBILE OVERLAY ══════ */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ══════ SIDEBAR (Dark Theme + Collapsible) ══════ */}
      <aside
        className={`fixed md:relative top-0 left-0 h-screen z-50 flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ 
          backgroundColor: '#0F172A',
          width: isSidebarCollapsed ? '80px' : '260px',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
        }}
      >
        {/* Sidebar Logo */}
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-6 mb-2 transition-all`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex shrink-0 items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              LP
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden whitespace-nowrap transition-all duration-300">
                <span className="text-base font-bold text-white">
                  Lite<span className="text-blue-400">POS</span>
                </span>
                <p className="text-[11px] font-medium text-slate-400">Toko Saya</p>
              </div>
            )}
          </div>
          {/* Close button for mobile */}
          <button 
            className="md:hidden text-slate-400 hover:text-white p-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={location.pathname === item.id}
              onClick={() => handleNavClick(item.id)}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 pb-4 pt-4 space-y-1 bg-slate-900 border-t border-slate-800">
          {user?.role === 'cashier' && (
            <NavItem
              icon="🔒"
              label="Tutup Shift"
              active={false}
              onClick={() => handleNavClick('/tutup-shift')}
              isCollapsed={isSidebarCollapsed}
            />
          )}
          <NavItem
            icon="🚪"
            label="Keluar"
            active={false}
            onClick={() => { logout(); navigate('/login'); }}
            isCollapsed={isSidebarCollapsed}
          />
          
          {/* Collapse Toggle Button (Desktop Only) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex w-full mt-2 items-center justify-center py-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
               </svg>
            ) : (
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
                 Sembunyikan
               </div>
            )}
          </button>
        </div>
      </aside>

      {/* ══════ MAIN CONTENT AREA ══════ */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header
          className="flex items-center justify-between px-4 md:px-6 py-3.5 shrink-0 z-10 bg-white"
          style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{greet}</p>
              <h1 className="text-base md:text-lg font-bold text-slate-800">{getPageTitle()}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={runOfflineSync}
                disabled={syncingOffline}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
                title="Klik untuk sinkronkan transaksi offline ke server"
              >
                {syncingOffline ? '⏳ Sinkron...' : `⚡ ${pendingOfflineCount} Tertunda`}
              </button>
            )}
            <span
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
              style={
                user?.role === 'owner'
                  ? { backgroundColor: '#FFF3E0', color: '#8B5E00', border: '1px solid #FFE0B2' }
                  : { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE' }
              }
            >
              {user?.role === 'owner' ? '👑 Owner' : '💼 Kasir'}
            </span>
          </div>
        </header>

        {/* Render Child Route Content Here */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default DashboardLayout;
