import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, clearAuthToken, setAuthToken } from '../utils/api';

const AuthContext = createContext(null);

/**
 * Normalize the user object from the server.
 * Server already returns { username, avatarUrl, name, ... } correctly.
 * This just ensures every field has a safe fallback.
 */
const normalizeUser = (raw) => {
  if (!raw) return null;
  return {
    ...raw,
    username: raw.username || '',
    avatarUrl: raw.avatarUrl || '',
    name: raw.name || raw.username || '',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUserRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always normalize before storing
  const setUser = useCallback((raw) => setUserRaw(normalizeUser(raw)), []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users/me');
      if (!res.ok) {
        setUserRaw(null);
        return;
      }
      const json = await res.json();
      setUser(json.user || null);
    } catch {
      setUserRaw(null);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setUserRaw(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const refresh = await apiFetch('/api/auth/refresh', { method: 'POST' });
        if (refresh.ok) {
          const json = await refresh.json();
          if (json.accessToken) setAuthToken(json.accessToken);
        }
        const res = await apiFetch('/api/users/me');
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          if (mounted) setUser(json.user || null);
        } else {
          if (mounted) setUserRaw(null);
        }
      } catch {
        if (mounted) setUserRaw(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
