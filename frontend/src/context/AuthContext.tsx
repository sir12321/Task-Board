import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
} from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { apiClient } from '../utils/api';
import type { AuthUser, Notification } from '../types/Types';

const notificationPollIntervalMs = 5000;

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser | null }
  | {
      type: 'SET_USER_FN';
      payload: (prev: AuthUser | null) => AuthUser | null;
    };

const authReducer = (
  state: AuthUser | null,
  action: AuthAction,
): AuthUser | null => {
  switch (action.type) {
    case 'SET_USER':
      return action.payload;
    case 'SET_USER_FN':
      return action.payload(state);
    default:
      return state;
  }
};

interface AuthContextType {
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, dispatch] = useReducer(authReducer, null);
  const [loading, setLoading] = useState(true);

  const setUser: Dispatch<SetStateAction<AuthUser | null>> = useCallback(
    (action) => {
      if (typeof action === 'function') {
        dispatch({
          type: 'SET_USER_FN',
          payload: action as (prev: AuthUser | null) => AuthUser | null,
        });
      } else {
        dispatch({ type: 'SET_USER', payload: action });
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear local state regardless
    }
    dispatch({ type: 'SET_USER', payload: null });
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      // Try refreshing the session; the backend sets cookies so a subsequent
      // request will be authenticated.
      const data = await apiClient('/auth/refresh', { method: 'POST' });
      if (data?.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
      }
    } catch {
      // If the refresh token is missing or expired, we just silently log them out locally
      dispatch({ type: 'SET_USER', payload: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const pollNotifications = useCallback(async () => {
    try {
      const notifications: Notification[] = await apiClient('/notifications');
      dispatch({
        type: 'SET_USER_FN',
        payload: (prev) => (prev ? { ...prev, notifications } : prev),
      });
    } catch {
      // Ignore transient polling errors; next interval will retry.
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void pollNotifications();

    const pollIntervalId = setInterval(() => {
      void pollNotifications();
    }, notificationPollIntervalMs);

    return () => {
      clearInterval(pollIntervalId);
    };
  }, [pollNotifications, user?.id]);

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
