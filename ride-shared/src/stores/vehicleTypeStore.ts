import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VehicleTypeConfig, ID } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

interface VehicleTypeStore {
  vehicleTypes: VehicleTypeConfig[];
  addVehicleType: (vt: Omit<VehicleTypeConfig, 'id'>) => void;
  updateVehicleType: (id: ID, updates: Partial<VehicleTypeConfig>) => void;
  toggleVehicleType: (id: ID) => void;
  getVehicleTypesByTenant: (tenantId: ID) => VehicleTypeConfig[];
}

export const useVehicleTypeStore = create<VehicleTypeStore>()(
  persist(
    (set, get) => ({
      vehicleTypes: [],
      addVehicleType: (vt) => {
        set((state) => ({
          vehicleTypes: [...state.vehicleTypes, { ...vt, id: generateId() }],
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
      getVehicleTypesByTenant: (tenantId) => {
        return get().vehicleTypes.filter((v) => v.tenantId === tenantId);
      },
    }),
    {
      name: 'ride-vehicle-types',
    }
  )
);
