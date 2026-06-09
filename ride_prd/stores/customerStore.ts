import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Customer, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface CustomerStore {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id">) => void;
  updateCustomer: (id: ID, updates: Partial<Customer>) => void;
  toggleCustomer: (id: ID) => void;
  getCustomersByTenant: (tenantId: ID) => Customer[];
}

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "C1",
    tenantId: "T1",
    name: "IndiGo Airlines",
    code: "INDIGO",
    billingCycle: "MONTHLY",
    spocName: "Priya Sharma",
    phone: "+919123456789",
    email: "dispatcher@indigo.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-HUB-001",
    active: true,
  },
  {
    id: "C2",
    tenantId: "T1",
    name: "Acme Logistics Ltd",
    code: "ACME-LOG",
    billingCycle: "FORTNIGHTLY",
    spocName: "Vikram Reddy",
    phone: "+919988776655",
    email: "transport@acme.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT4"],
    defaultCostCenter: "LOG-KA-001",
    active: true,
  },
  {
    id: "C3",
    tenantId: "T1",
    name: "TechCorp India Pvt Ltd",
    code: "TECHCORP",
    billingCycle: "WEEKLY",
    spocName: "Anjali Gupta",
    phone: "+919555666777",
    email: "admin@techcorp.local",
    approvedVehicleTypeIds: ["VT1", "VT2"],
    defaultCostCenter: "TECH-BNG-001",
    active: true,
  },
  {
    id: "C4",
    tenantId: "T2",
    name: "SpiceJet Airlines",
    code: "SPICEJET",
    billingCycle: "MONTHLY",
    spocName: "Rohan Verma",
    phone: "+919111222333",
    email: "logistics@spicejet.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-BNG-001",
    active: true,
  },
  {
    id: "C5",
    tenantId: "T2",
    name: "Bangalore Tech Hub",
    code: "BTH-2024",
    billingCycle: "MONTHLY",
    spocName: "Neha Singh",
    phone: "+919444555666",
    email: "transport@techub.local",
    approvedVehicleTypeIds: ["VT1"],
    defaultCostCenter: "TECH-HUB-001",
    active: true,
  },
  {
    id: "C6",
    tenantId: "T3",
    name: "Emirates Airlines",
    code: "EMIRATES",
    billingCycle: "MONTHLY",
    spocName: "Fatima Al-Dosari",
    phone: "+971501234567",
    email: "dispatch@emirates.ae",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-UAE-001",
    active: true,
  },
];

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: SEED_CUSTOMERS,
      addCustomer: (customer) => {
        set((state) => ({
          customers: [...state.customers, { ...customer, id: id() }],
        }));
      },
      updateCustomer: (cid, updates) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === cid ? { ...c, ...updates } : c)),
        }));
      },
      toggleCustomer: (cid) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === cid ? { ...c, active: !c.active } : c)),
        }));
      },
      getCustomersByTenant: (tenantId) => {
        return get().customers.filter((c) => c.tenantId === tenantId);
      },
    }),
    {
      name: "ride-customers",
    }
  )
);
