import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Vehicle, VehicleDocument, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface VehicleStore {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => void;
  updateVehicle: (id: ID, updates: Partial<Vehicle>) => void;
  toggleVehicle: (id: ID) => void;
  getVehiclesByTenant: (tenantId: ID) => Vehicle[];
}

const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);
const nextYearStr = nextYear.toISOString().split("T")[0];

const expiredDate = new Date();
expiredDate.setDate(expiredDate.getDate() - 10);
const expiredDateStr = expiredDate.toISOString().split("T")[0];

const expiringSoonDate = new Date();
expiringSoonDate.setDate(expiringSoonDate.getDate() + 15);
const expiringSoonDateStr = expiringSoonDate.toISOString().split("T")[0];

const SEED_VEHICLES: Vehicle[] = [
  {
    id: "VH1",
    tenantId: "T1",
    ownerVendorId: "V1",
    ownership: "OWN",
    vehicleTypeId: "VT1",
    make: "Maruti",
    model: "Swift",
    year: 2022,
    registrationNo: "KA05AB1234",
    seatingCapacity: 4,
    ac: true,
    fuelType: "CNG",
    traccarDeviceId: "TRACE001",
    documents: [
      {
        kind: "REGISTRATION",
        number: "KA05AB1234",
        expiry: nextYearStr,
        fileName: "registration_vh1.pdf",
      },
      {
        kind: "FITNESS",
        number: "FIT2022001",
        expiry: expiringSoonDateStr,
        fileName: "fitness_vh1.pdf",
      },
    ],
    active: true,
  },
  {
    id: "VH2",
    tenantId: "T1",
    ownerVendorId: "V1",
    ownership: "OWN",
    vehicleTypeId: "VT2",
    make: "Mahindra",
    model: "XUV700",
    year: 2023,
    registrationNo: "KA05AC5678",
    seatingCapacity: 6,
    ac: true,
    fuelType: "DIESEL",
    traccarDeviceId: "TRACE002",
    documents: [
      {
        kind: "REGISTRATION",
        number: "KA05AC5678",
        expiry: nextYearStr,
        fileName: "registration_vh2.pdf",
      },
      {
        kind: "PUC",
        number: "PUC2023001",
        expiry: nextYearStr,
        fileName: "puc_vh2.pdf",
      },
    ],
    active: true,
  },
  {
    id: "VH3",
    tenantId: "T1",
    ownerVendorId: "V2",
    ownership: "SUB_VENDOR",
    vehicleTypeId: "VT3",
    make: "Force",
    model: "Tempo Traveller",
    year: 2021,
    registrationNo: "KA05XY9012",
    seatingCapacity: 13,
    ac: true,
    fuelType: "DIESEL",
    documents: [
      {
        kind: "REGISTRATION",
        number: "KA05XY9012",
        expiry: expiredDateStr,
        fileName: "registration_vh3.pdf",
      },
    ],
    active: true,
  },
  {
    id: "VH4",
    tenantId: "T2",
    ownerVendorId: "V4",
    ownership: "OWN",
    vehicleTypeId: "VT5",
    make: "Hyundai",
    model: "Creta",
    year: 2023,
    registrationNo: "KA07AB3456",
    seatingCapacity: 4,
    ac: true,
    fuelType: "PETROL",
    traccarDeviceId: "TRACE004",
    documents: [
      {
        kind: "REGISTRATION",
        number: "KA07AB3456",
        expiry: nextYearStr,
        fileName: "registration_vh4.pdf",
      },
    ],
    active: true,
  },
  {
    id: "VH5",
    tenantId: "T3",
    ownerVendorId: "V6",
    ownership: "OWN",
    vehicleTypeId: "VT7",
    make: "Mercedes",
    model: "C-Class",
    year: 2024,
    registrationNo: "DXB-123456",
    seatingCapacity: 4,
    ac: true,
    fuelType: "DIESEL",
    traccarDeviceId: "TRACE005",
    documents: [
      {
        kind: "REGISTRATION",
        number: "DXB-123456",
        expiry: nextYearStr,
        fileName: "registration_vh5.pdf",
      },
    ],
    active: true,
  },
];

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      vehicles: SEED_VEHICLES,
      addVehicle: (vehicle) => {
        set((state) => ({
          vehicles: [...state.vehicles, { ...vehicle, id: id() }],
        }));
      },
      updateVehicle: (vid, updates) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === vid ? { ...v, ...updates } : v)),
        }));
      },
      toggleVehicle: (vid) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === vid ? { ...v, active: !v.active } : v)),
        }));
      },
      getVehiclesByTenant: (tenantId) => {
        return get().vehicles.filter((v) => v.tenantId === tenantId);
      },
    }),
    {
      name: "ride-vehicles",
    }
  )
);
