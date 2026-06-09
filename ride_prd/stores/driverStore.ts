import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Driver, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface DriverStore {
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, "id">) => void;
  updateDriver: (id: ID, updates: Partial<Driver>) => void;
  toggleDriver: (id: ID) => void;
  getDriversByTenant: (tenantId: ID) => Driver[];
}

const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);
const nextYearStr = nextYear.toISOString().split("T")[0];

const expiringSoonDate = new Date();
expiringSoonDate.setDate(expiringSoonDate.getDate() + 20);
const expiringSoonDateStr = expiringSoonDate.toISOString().split("T")[0];

const SEED_DRIVERS: Driver[] = [
  {
    id: "D1",
    tenantId: "T1",
    vendorId: "V1",
    name: "Rajesh Kumar",
    phone: "+919876543210",
    licenceNo: "KA01AB1234",
    licenceClass: "HMV+PSV",
    documents: [
      {
        kind: "LICENCE",
        number: "KA01AB1234",
        expiry: nextYearStr,
        fileName: "licence_d1.pdf",
      },
      {
        kind: "PSV_BADGE",
        number: "PSV2023001",
        expiry: nextYearStr,
        fileName: "psv_d1.pdf",
      },
    ],
    languages: ["Kannada", "Hindi", "English"],
    assignedVehicleIds: ["VH1"],
    shift: "DAY",
    rating: 4.8,
    available: true,
    active: true,
  },
  {
    id: "D2",
    tenantId: "T1",
    vendorId: "V1",
    name: "Suresh Gowda",
    phone: "+919988776655",
    licenceNo: "KA01CD5678",
    licenceClass: "HMV+PSV",
    documents: [
      {
        kind: "LICENCE",
        number: "KA01CD5678",
        expiry: expiringSoonDateStr,
        fileName: "licence_d2.pdf",
      },
      {
        kind: "POLICE_VERIFICATION",
        number: "PV2023001",
        expiry: nextYearStr,
        fileName: "pv_d2.pdf",
      },
    ],
    languages: ["Kannada", "Hindi"],
    assignedVehicleIds: ["VH2"],
    shift: "NIGHT",
    rating: 4.5,
    available: true,
    active: true,
  },
  {
    id: "D3",
    tenantId: "T1",
    vendorId: "V2",
    name: "Anand Rao",
    phone: "+919123456789",
    licenceNo: "KA01EF9012",
    licenceClass: "HMV",
    documents: [
      {
        kind: "LICENCE",
        number: "KA01EF9012",
        expiry: nextYearStr,
        fileName: "licence_d3.pdf",
      },
    ],
    languages: ["Kannada", "English"],
    assignedVehicleIds: ["VH3"],
    shift: "DAY",
    rating: 4.2,
    available: false,
    active: true,
  },
  {
    id: "D4",
    tenantId: "T2",
    vendorId: "V4",
    name: "Ramesh Verma",
    phone: "+919555666777",
    licenceNo: "KA07AB3456",
    licenceClass: "HMV+PSV",
    documents: [
      {
        kind: "LICENCE",
        number: "KA07AB3456",
        expiry: nextYearStr,
        fileName: "licence_d4.pdf",
      },
    ],
    languages: ["Kannada", "Hindi", "English", "Tamil"],
    assignedVehicleIds: ["VH4"],
    shift: "FLEX",
    rating: 4.9,
    available: true,
    active: true,
  },
  {
    id: "D5",
    tenantId: "T3",
    vendorId: "V6",
    name: "Ahmed Al-Mansouri",
    phone: "+971501234567",
    licenceNo: "UAE-DXB-001",
    licenceClass: "Unlimited",
    documents: [
      {
        kind: "LICENCE",
        number: "UAE-DXB-001",
        expiry: nextYearStr,
        fileName: "licence_d5.pdf",
      },
    ],
    languages: ["Arabic", "English", "Hindi"],
    assignedVehicleIds: ["VH5"],
    shift: "DAY",
    rating: 4.7,
    available: true,
    active: true,
  },
];

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      drivers: SEED_DRIVERS,
      addDriver: (driver) => {
        set((state) => ({
          drivers: [...state.drivers, { ...driver, id: id() }],
        }));
      },
      updateDriver: (did, updates) => {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === did ? { ...d, ...updates } : d)),
        }));
      },
      toggleDriver: (did) => {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === did ? { ...d, active: !d.active } : d)),
        }));
      },
      getDriversByTenant: (tenantId) => {
        return get().drivers.filter((d) => d.tenantId === tenantId);
      },
    }),
    {
      name: "ride-drivers",
    }
  )
);
