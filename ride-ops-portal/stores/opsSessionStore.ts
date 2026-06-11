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
  setSession: (s: OpsSession) => void;
  clearSession: () => void;
}

export const useOpsSessionStore = create<OpsSessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      clearSession: () => set({ session: null }),
    }),
    { name: 'ride-ops-session' }
  )
);
