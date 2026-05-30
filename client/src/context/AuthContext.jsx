import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

import { API_URL } from '../config';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Axios instance
  const api = axios.create({
    baseURL: API_URL
  });

  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
      checkShiftStatus();
    } else {
      setLoading(false);
    }
  }, [token]);

  const checkShiftStatus = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        const res = await api.get(`/shifts/status/${storedUser.id}`);
        if (res.data.hasOpenShift) {
          setShift(res.data.shift);
        } else {
          setShift(null);
        }
      }
    } catch (error) {
      console.error('Error checking shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setShift(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, shift, loading, login, logout, setShift, api }}>
      {children}
    </AuthContext.Provider>
  );
};
