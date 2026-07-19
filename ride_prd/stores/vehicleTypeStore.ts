'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VehicleTypeConfig } from '@/lib/types';

interface VehicleTypeStore {
  vehicleTypes: VehicleTypeConfig[];
  setVehicleTypes: (vehicleTypes: VehicleTypeConfig[]) => void;
  addVehicleType: (vt: Omit<VehicleTypeConfig, 'id'>) => void;
  updateVehicleType: (id: string, updates: Partial<VehicleTypeConfig>) => void;
  toggleVehicleType: (id: string) => void;
  getVehicleTypesByTenant: (tenantId: string) => VehicleTypeConfig[];
  deduplicateVehicleTypes: () => void;
}

export const useVehicleTypeStore = create<VehicleTypeStore>()(
  persist(
    (set, get) => ({
      vehicleTypes: [],
      setVehicleTypes: (vehicleTypes) => set({ vehicleTypes }),
      addVehicleType: (vt) => {
        set((state) => ({
          vehicleTypes: [...state.vehicleTypes, { ...vt, id: crypto.randomUUID() }],
        }));
      },
      updateVehicleType: (vtid, updates) => {
        set((state) => ({
          vehicleTypes: state.vehicleTypes.map((v) => (v.id === vtid ? { ...v, ...updates } : v)),
        }));
      },
      toggleVehicleType: (vtid) => {
        set((state) => ({
          vehicleTypes: state.vehicleTypes.map((v) => (v.id === vtid ? { ...v, active: !v.active } : v)),
        }));
      },
      getVehicleTypesByTenant: (tenantId) => get().vehicleTypes.filter((v) => v.tenantId === tenantId),
      deduplicateVehicleTypes: () => {
        set((state) => {
          const seen = new Map<string, VehicleTypeConfig>();
          for (const vt of state.vehicleTypes) {
            const key = vt.name.toLowerCase().trim();
            if (!seen.has(key)) seen.set(key, vt);
          }
          return { vehicleTypes: Array.from(seen.values()) };
        });
      },
    }),
    { name: 'ride-vehicle-types' }
  )
);
