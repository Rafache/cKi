import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AbraxioApiError, fetchAbraxioMembers } from './api/client';
import { mapDtddResources } from './api/mapper';
import type { DtddResource } from './types';

interface AppState {
  token: string | null;
  resources: DtddResource[];
  isLoading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  authenticate: (token: string) => Promise<boolean>;
  loadResources: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

async function load(token: string): Promise<DtddResource[]> {
  return mapDtddResources(await fetchAbraxioMembers(token));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      resources: [],
      isLoading: false,
      error: null,
      lastUpdatedAt: null,
      authenticate: async (rawToken) => {
        const token = rawToken.trim().replace(/^Bearer\s+/i, '');
        if (!token) {
          set({ error: 'Saisissez un token Abraxio.' });
          return false;
        }
        set({ isLoading: true, error: null });
        try {
          const resources = await load(token);
          set({ token, resources, isLoading: false, lastUpdatedAt: new Date().toISOString() });
          return true;
        } catch (error) {
          set({ token: null, resources: [], isLoading: false, error: (error as Error).message });
          return false;
        }
      },
      loadResources: async () => {
        const token = get().token;
        if (!token) return;
        set({ isLoading: true, error: null });
        try {
          const resources = await load(token);
          set({ resources, isLoading: false, lastUpdatedAt: new Date().toISOString() });
        } catch (error) {
          const unauthorized = error instanceof AbraxioApiError && error.status === 401;
          set({
            token: unauthorized ? null : token,
            resources: unauthorized ? [] : get().resources,
            isLoading: false,
            error: (error as Error).message,
          });
        }
      },
      logout: () => set({ token: null, resources: [], error: null, lastUpdatedAt: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'cki-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
