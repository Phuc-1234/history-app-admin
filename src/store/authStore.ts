// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types/api';

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  apiEnv: 'local' | 'production';
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  setApiEnv: (env: 'local' | 'production') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      apiEnv: (import.meta.env.VITE_API_ENV as 'local' | 'production') || 'local',
      login: (token, user) => set({ accessToken: token, user }),
      logout: () => set({ accessToken: null, user: null }),
      setApiEnv: (env) => set({ apiEnv: env }),
    }),
    { name: 'auth-storage' }
  )
);
