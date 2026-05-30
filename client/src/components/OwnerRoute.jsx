import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OwnerRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'owner') {
    return <Navigate to="/kasir" replace />;
  }

  return <Outlet />;
};

export default OwnerRoute;
