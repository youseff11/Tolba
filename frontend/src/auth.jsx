import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('vs-logout', onLogout);
    if (localStorage.getItem('vs_token')) {
      api.get('/auth/me').then((r) => setUser(r.data)).catch(() => {}).finally(() => setReady(true));
    } else {
      setReady(true);
    }
    return () => window.removeEventListener('vs-logout', onLogout);
  }, []);

  const signIn = useCallback(async (mode, body) => {
    const r = await api.post(mode === 'register' ? '/auth/register' : '/auth/login', body);
    localStorage.setItem('vs_token', r.data.token);
    setUser(r.data.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* token may already be gone */
    }
    localStorage.removeItem('vs_token');
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
