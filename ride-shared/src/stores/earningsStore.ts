import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VendorEarnings } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

interface EarningsStore {
  earnings: VendorEarnings[];
  setEarnings: (earnings: VendorEarnings[]) => void;
  createEarning: (entry: Omit<VendorEarnings, 'earningId'>) => VendorEarnings;
  getEarningsForVendor: (vendorId: string) => VendorEarnings[];
  getTotalNetForVendor: (vendorId: string, period?: 'today' | 'month' | 'lastMonth') => number;
  getPendingForVendor: (vendorId: string) => number;
}

export const useEarningsStore = create<EarningsStore>()(
  persist(
    (set, get) => ({
      earnings: [],
      setEarnings: (earnings) => set({ earnings }),
      createEarning: (entry) => {
        const earning: VendorEarnings = { ...entry, earningId: `EARN-${generateId().slice(0, 8)}` };
        set((state) => ({ earnings: [...state.earnings, earning] }));
        return earning;
      },
      getEarningsForVendor: (vendorId) => get().earnings.filter((e) => e.vendorId === vendorId),
      getTotalNetForVendor: (vendorId, period = 'month') => {
        const now = new Date();
        return get()
          .earnings.filter((e) => {
            if (e.vendorId !== vendorId) return false;
            const d = new Date(e.completedAt);
            if (period === 'today') return d.toDateString() === now.toDateString();
            if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
          })
          .reduce((sum, e) => sum + e.netToVendor, 0);
      },
      getPendingForVendor: (vendorId) =>
        get()
          .earnings.filter((e) => e.vendorId === vendorId && e.status === 'UNBILLED')
          .reduce((sum, e) => sum + e.netToVendor, 0),
    }),
    { name: 'ride-vendor-earnings' }
  )
);
