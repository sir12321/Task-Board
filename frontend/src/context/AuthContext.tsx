import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../utils/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  globalRole: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
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
    return <div style={{ padding: '20px' }}>Loading session...</div>; 
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
