import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, shift, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cashier must have an open shift to access main checkout (not /buka-shift or /tutup-shift)
  const isShiftPage = window.location.pathname === '/buka-shift' || window.location.pathname === '/tutup-shift';
  
  if (user.role === 'cashier' && !shift && !isShiftPage) {
    return <Navigate to="/buka-shift" replace />;
  }

  return children;
};

export default ProtectedRoute;
