// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      updateTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
