'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vehicle } from '@/lib/types';

interface VehicleStore {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  toggleVehicle: (id: string) => void;
  getVehiclesByTenant: (tenantId: string) => Vehicle[];
  getVehiclesByVendor: (vendorId: string) => Vehicle[];
  deduplicateVehicles: () => void;
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      vehicles: [],
      setVehicles: (vehicles) => set({ vehicles }),
      addVehicle: (vehicle) => {
        set((state) => ({ vehicles: [...state.vehicles, { ...vehicle, id: crypto.randomUUID() }] }));
      },
      updateVehicle: (id, updates) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        }));
      },
      toggleVehicle: (id) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
        }));
      },
      getVehiclesByTenant: (tenantId) => get().vehicles.filter((v) => v.tenantId === tenantId),
      getVehiclesByVendor: (vendorId) => get().vehicles.filter((v) => v.ownerVendorId === vendorId),
      deduplicateVehicles: () => {
        set((state) => {
          const seen = new Map<string, Vehicle>();
          for (const v of state.vehicles) {
            const key = v.registrationNo.toLowerCase().trim();
            if (!seen.has(key)) seen.set(key, v);
          }
          return { vehicles: Array.from(seen.values()) };
        });
      },
    }),
    { name: 'ride-vehicles' }
  )
);
