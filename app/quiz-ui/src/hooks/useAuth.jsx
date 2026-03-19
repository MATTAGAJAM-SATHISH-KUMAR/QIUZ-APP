import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setBasicAuth, clearBasicAuth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load user profile.
    // In production: App Router forwards XSUAA JWT automatically.
    // In development: Basic auth header is set from stored credentials.
    const stored = sessionStorage.getItem('dev_credentials');
    if (stored) {
      const { email, password } = JSON.parse(stored);
      setBasicAuth(email, password);
    }

    authApi.me()
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Dev mode login — sets Basic Auth header for CAP mocked auth
  const login = useCallback(async (email, password) => {
    setBasicAuth(email, password);
    try {
      const { data } = await authApi.me();
      sessionStorage.setItem('dev_credentials', JSON.stringify({ email, password }));
      setUser(data);
      return data;
    } catch (err) {
      clearBasicAuth();
      sessionStorage.removeItem('dev_credentials');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    clearBasicAuth();
    sessionStorage.removeItem('dev_credentials');
    setUser(null);
    // In production, redirect to approuter logout
    if (window.location.hostname !== 'localhost') {
      window.location.href = '/logout';
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
