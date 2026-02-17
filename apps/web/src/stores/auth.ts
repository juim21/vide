import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api';
import type { User } from '@vide/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api<{ success: boolean; data: { accessToken: string; user: User } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    setAccessToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  signup: async (username, email, password) => {
    const res = await api<{ success: boolean; data: { accessToken: string; user: User } }>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify({ username, email, password }) }
    );
    setAccessToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      // Try refresh first
      const refreshRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh`,
        { method: 'POST', credentials: 'include' }
      );
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setAccessToken(refreshData.data.accessToken);
          const meRes = await api<{ success: boolean; data: User }>('/api/auth/me');
          set({ user: meRes.data, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch { /* ignore */ }
    set({ isLoading: false });
  },
}));
