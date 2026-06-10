import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PayoutEntry } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function generatePayoutId(): string {
  return `POUT-${generateId().slice(0, 8).toUpperCase()}`;
}

interface PayoutStore {
  payouts: PayoutEntry[];
  addPayout: (entry: Omit<PayoutEntry, 'id'>) => PayoutEntry;
  getPayoutsForVendor: (vendorId: string) => PayoutEntry[];
  getPendingPayouts: (vendorId: string) => PayoutEntry[];
  getPaidPayouts: (vendorId: string) => PayoutEntry[];
  getTotalPaid: (vendorId: string) => number;
}

export const usePayoutStore = create<PayoutStore>()(
  persist(
    (set, get) => ({
      payouts: [],
      addPayout: (entry) => {
        const payout: PayoutEntry = { ...entry, id: generatePayoutId() };
        set((state) => ({ payouts: [...state.payouts, payout] }));
        return payout;
      },
      getPayoutsForVendor: (vendorId) =>
        get().payouts.filter((p) => p.vendorId === vendorId).sort(
          (a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime()
        ),
      getPendingPayouts: (vendorId) =>
        get().payouts.filter((p) => p.vendorId === vendorId && p.status === 'PENDING'),
      getPaidPayouts: (vendorId) =>
        get().payouts.filter((p) => p.vendorId === vendorId && p.status === 'PAID'),
      getTotalPaid: (vendorId) =>
        get()
          .payouts.filter((p) => p.vendorId === vendorId && p.status === 'PAID')
          .reduce((sum, p) => sum + p.amount, 0),
    }),
    { name: 'ride-vendor-payouts' }
  )
);
