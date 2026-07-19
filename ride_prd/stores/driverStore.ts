'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Driver } from '@/lib/types';

interface DriverStore {
  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  toggleDriver: (id: string) => void;
  getDriversByTenant: (tenantId: string) => Driver[];
  getDriversByVendor: (vendorId: string) => Driver[];
  deduplicateDrivers: () => void;
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      drivers: [],
      setDrivers: (drivers) => set({ drivers }),
      addDriver: (driver) => {
        set((state) => ({ drivers: [...state.drivers, { ...driver, id: crypto.randomUUID() }] }));
      },
      updateDriver: (id, updates) => {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
      },
      toggleDriver: (id) => {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === id ? { ...d, active: !d.active } : d)),
        }));
      },
      getDriversByTenant: (tenantId) => get().drivers.filter((d) => d.tenantId === tenantId),
      getDriversByVendor: (vendorId) => get().drivers.filter((d) => d.vendorId === vendorId),
      deduplicateDrivers: () => {
        set((state) => {
          const seen = new Map<string, Driver>();
          for (const d of state.drivers) {
            const key = d.name.toLowerCase().trim();
            if (!seen.has(key)) seen.set(key, d);
          }
          return { drivers: Array.from(seen.values()) };
        });
      },
    }),
    { name: 'ride-drivers' }
  )
);
