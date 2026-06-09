import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Tenant } from "@/lib/types";

interface TenantStore {
  tenants: Tenant[];
  activeTenantId: string;
  setActiveTenant: (id: string) => void;
  getActiveTenant: () => Tenant | undefined;
}

const SEED_TENANTS: Tenant[] = [
  {
    id: "T1",
    name: "Hubballi Transport Co",
    legalName: "Hubballi Transport Co Pvt Ltd",
    baseCity: "Hubballi",
    contractCurrency: "INR",
  },
  {
    id: "T2",
    name: "Bengaluru Rides Pvt Ltd",
    legalName: "Bengaluru Rides Private Limited",
    baseCity: "Bengaluru",
    contractCurrency: "INR",
  },
  {
    id: "T3",
    name: "Gulf Express (Demo)",
    legalName: "Gulf Express International FZCO",
    baseCity: "Dubai",
    contractCurrency: "AED",
  },
];

export const useTenantStore = create<TenantStore>()(
  persist(
    (set, get) => ({
      tenants: SEED_TENANTS,
      activeTenantId: "T1",
      setActiveTenant: (id: string) => {
        const tenant = get().tenants.find((t) => t.id === id);
        if (tenant) {
          set({ activeTenantId: id });
        }
      },
      getActiveTenant: () => {
        const state = get();
        return state.tenants.find((t) => t.id === state.activeTenantId);
      },
    }),
    {
      name: "ride-tenant",
    }
  )
);
