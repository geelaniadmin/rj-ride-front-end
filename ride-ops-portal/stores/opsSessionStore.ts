'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OpsRole = 'control-room' | 'rate-manager' | 'super-admin';

export interface OpsSession {
  role: OpsRole;
  name: string;
  tenantId: string;
}

interface OpsSessionStore {
  session: OpsSession | null;
  hydrated: boolean;
  setSession: (s: OpsSession) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useOpsSessionStore = create<OpsSessionStore>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (s) => set({ session: s }),
      clearSession: () => set({ session: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'ride-ops-session',
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated();
      },
    }
  )
);
