import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Driver, ID } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

interface DriverStore {
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: ID, updates: Partial<Driver>) => void;
  toggleDriver: (id: ID) => void;
  getDriversByTenant: (tenantId: ID) => Driver[];
  getDriversByVendor: (vendorId: ID) => Driver[];
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      drivers: [],
      addDriver: (driver) => {
        set((state) => ({ drivers: [...state.drivers, { ...driver, id: generateId() }] }));
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
    }),
    { name: 'ride-drivers' } // SAME key as ride_prd
  )
);
