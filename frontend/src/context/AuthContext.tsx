import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { apiClient } from '../utils/api';
import type { AuthUser } from '../types/Types';

interface AuthContextType {
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear local state regardless
    }
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      // Try refreshing the session; the backend sets cookies so a subsequent
      // request will be authenticated.
      const data = await apiClient('/auth/refresh', { method: 'POST' });
      if (data?.user) {
        setUser(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f1f3f4',
          color: '#334155',
          fontWeight: 600,
          letterSpacing: '0.2px',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(2, 6, 23, 0.06)',
          }}
        >
          Restoring your session...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
