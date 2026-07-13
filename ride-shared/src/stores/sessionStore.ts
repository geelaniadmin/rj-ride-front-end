import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VendorSession } from '../types';
import { encryptedStorage } from '../encryptedStorage';

interface SessionStore {
  vendorSession: VendorSession | null;
  setVendorSession: (session: VendorSession | null) => void;
  clearSession: () => void;
  getVendorId: () => string | null;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      vendorSession: null,
      setVendorSession: (session) => set({ vendorSession: session }),
      clearSession: () => set({ vendorSession: null }),
      getVendorId: () => get().vendorSession?.vendorId || null,
    }),
    { name: 'ride-vendor-session', storage: createJSONStorage(() => encryptedStorage()) }
  )
);
