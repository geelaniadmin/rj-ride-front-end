'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vendor } from '@/lib/types';

const DEFAULT_VENDORS: Vendor[] = [
  { id: 'V1', tenantId: 'T1', name: 'Apex Fleet', type: 'SELF', active: true },
  { id: 'V2', tenantId: 'T1', name: 'Urban Drivers Co', type: 'SELF', active: true },
];

interface VendorStore {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  toggleVendor: (id: string) => void;
  getVendorsByTenant: (tenantId: string) => Vendor[];
}

export const useVendorStore = create<VendorStore>()(
  persist(
    (set, get) => ({
      vendors: [...DEFAULT_VENDORS],
      addVendor: (vendor) => {
        const id = crypto.randomUUID();
        set((state) => ({ vendors: [...state.vendors, { ...vendor, id }] }));
      },
      updateVendor: (vid, updates) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, ...updates } : v)),
        }));
      },
      toggleVendor: (vid) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, active: !v.active } : v)),
        }));
      },
      getVendorsByTenant: (tenantId) => get().vendors.filter((v) => v.tenantId === tenantId),
    }),
    {
      name: 'ride-vendors',
      merge: (persisted, initial) => {
        const ps = persisted as { vendors?: Vendor[] };
        const persistedVendors = ps?.vendors || [];
        const merged = [...DEFAULT_VENDORS];
        for (const v of persistedVendors) {
          if (!merged.find((m) => m.id === v.id)) merged.push(v);
        }
        return { ...initial, vendors: merged };
      },
    }
  )
);
