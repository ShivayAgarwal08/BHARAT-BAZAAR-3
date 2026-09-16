import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { api, getData, getToken, setToken } from '../services/api';
import type { AuthSession, User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    const restoringToken = getToken();
    async function restore() {
      try {
        if (restoringToken) {
          const restored = await getData<User>('/auth/me');
          if (active && restoringToken === getToken()) setUser(restored);
        }
      } catch (error) {
        if (active && getToken()) setSessionError(error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    const endSession = () => {
      setUser(null);
      setSessionError(null);
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'bharat-bazaar-token') window.location.reload();
    };
    window.addEventListener('bharat-bazaar-session-ended', endSession);
    window.addEventListener('storage', storageChanged);
    return () => {
      active = false;
      window.removeEventListener('bharat-bazaar-session-ended', endSession);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);
  function acceptSession(session: AuthSession) {
    setToken(session.token);
    setUser(session.user);
    setSessionError(null);
    setLoading(false);
  }
  async function refreshUser() {
    const current = await getData<User>('/auth/me');
    setUser(current);
    setSessionError(null);
    return current;
  }
  async function logout() {
    await api.post('/auth/logout', {});
    setToken(null);
    setUser(null);
    setSessionError(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, sessionError, acceptSession, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
