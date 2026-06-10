import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Vehicle, ID } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

interface VehicleStore {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: ID, updates: Partial<Vehicle>) => void;
  toggleVehicle: (id: ID) => void;
  getVehiclesByTenant: (tenantId: ID) => Vehicle[];
  getVehiclesByVendor: (vendorId: ID) => Vehicle[];
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      vehicles: [],
      addVehicle: (vehicle) => {
        set((state) => ({ vehicles: [...state.vehicles, { ...vehicle, id: generateId() }] }));
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
    }),
    { name: 'ride-vehicles' } // SAME key as ride_prd
  )
);
