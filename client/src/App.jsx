import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import OpenShift from './pages/OpenShift';
import CloseShift from './pages/CloseShift';
import Checkout from './pages/Checkout';
import DashboardHome from './pages/DashboardHome';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerRoute from './components/OwnerRoute';
import Reports from './pages/Reports';
import Products from './pages/Products';
import Cashiers from './pages/Cashiers';
import TransactionHistory from './pages/TransactionHistory';
import Settings from './pages/Settings';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/buka-shift" element={
            <ProtectedRoute>
              <OpenShift />
            </ProtectedRoute>
          } />
          <Route path="/tutup-shift" element={
            <ProtectedRoute>
              <CloseShift />
            </ProtectedRoute>
          } />

          {/* Rute yang dibungkus oleh DashboardLayout (Sidebar Tetap Ada) */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/kasir" element={<Checkout />} />
            <Route path="/riwayat" element={<TransactionHistory />} />

            {/* Owner Protected Routes */}
            <Route element={<OwnerRoute />}>
              <Route path="/laporan" element={<Reports />} />
              <Route path="/produk" element={<Products />} />
              <Route path="/owner/cashiers" element={<Cashiers />} />
              <Route path="/pengaturan" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
