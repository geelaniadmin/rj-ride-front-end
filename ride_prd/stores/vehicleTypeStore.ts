import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VehicleTypeConfig, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface VehicleTypeStore {
  vehicleTypes: VehicleTypeConfig[];
  addVehicleType: (vt: Omit<VehicleTypeConfig, "id">) => void;
  updateVehicleType: (id: ID, updates: Partial<VehicleTypeConfig>) => void;
  toggleVehicleType: (id: ID) => void;
  getVehicleTypesByTenant: (tenantId: ID) => VehicleTypeConfig[];
}

const SEED_VEHICLE_TYPES: VehicleTypeConfig[] = [
  {
    id: "VT1",
    tenantId: "T1",
    name: "Sedan",
    seatingCapacity: 4,
    ac: true,
    class: "Economy",
    active: true,
  },
  {
    id: "VT2",
    tenantId: "T1",
    name: "SUV",
    seatingCapacity: 6,
    ac: true,
    class: "Premium",
    active: true,
  },
  {
    id: "VT3",
    tenantId: "T1",
    name: "Tempo Traveller",
    seatingCapacity: 13,
    ac: true,
    class: "Comfort",
    active: true,
  },
  {
    id: "VT4",
    tenantId: "T1",
    name: "Coach",
    seatingCapacity: 49,
    ac: true,
    class: "Standard",
    active: true,
  },
  {
    id: "VT5",
    tenantId: "T2",
    name: "Sedan",
    seatingCapacity: 4,
    ac: true,
    class: "Economy",
    active: true,
  },
  {
    id: "VT6",
    tenantId: "T2",
    name: "SUV",
    seatingCapacity: 6,
    ac: true,
    class: "Premium",
    active: true,
  },
  {
    id: "VT7",
    tenantId: "T3",
    name: "Sedan",
    seatingCapacity: 4,
    ac: true,
    class: "Luxury",
    active: true,
  },
  {
    id: "VT8",
    tenantId: "T3",
    name: "SUV",
    seatingCapacity: 7,
    ac: true,
    class: "Premium",
    active: true,
  },
];

export const useVehicleTypeStore = create<VehicleTypeStore>()(
  persist(
    (set, get) => ({
      vehicleTypes: SEED_VEHICLE_TYPES,
      addVehicleType: (vt) => {
        set((state) => ({
          vehicleTypes: [...state.vehicleTypes, { ...vt, id: id() }],
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
      name: "ride-vehicle-types",
    }
  )
);
