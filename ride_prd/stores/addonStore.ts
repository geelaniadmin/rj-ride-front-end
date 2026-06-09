import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AddonService, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface AddonStore {
  addons: AddonService[];
  addAddon: (addon: Omit<AddonService, "id">) => void;
  updateAddon: (id: ID, updates: Partial<AddonService>) => void;
  toggleAddon: (id: ID) => void;
  getAddonsByTenant: (tenantId: ID) => AddonService[];
}

const SEED_ADDONS: AddonService[] = [
  {
    id: "A1",
    tenantId: "T1",
    category: "MEET_GREET",
    type: "TABLE",
    name: "Airport Meet & Greet",
    defaultInclude: false,
    price: 500,
  },
  {
    id: "A2",
    tenantId: "T1",
    category: "CHILD_SEAT",
    type: "SEAT",
    name: "Child Safety Seat (0-4 yrs)",
    defaultInclude: false,
    price: 300,
  },
  {
    id: "A3",
    tenantId: "T1",
    category: "CHILD_SEAT",
    type: "BOOSTER",
    name: "Booster Seat (4-12 yrs)",
    defaultInclude: false,
    price: 250,
  },
  {
    id: "A4",
    tenantId: "T1",
    category: "TOLL_ROAD",
    type: "TOLL",
    name: "Toll Road Coverage",
    defaultInclude: true,
    price: 0,
  },
  {
    id: "A5",
    tenantId: "T2",
    category: "MEET_GREET",
    type: "TABLE",
    name: "Airport Meet & Greet",
    defaultInclude: false,
    price: 600,
  },
  {
    id: "A6",
    tenantId: "T2",
    category: "CHILD_SEAT",
    type: "SEAT",
    name: "Child Safety Seat",
    defaultInclude: false,
    price: 350,
  },
  {
    id: "A7",
    tenantId: "T3",
    category: "MEET_GREET",
    type: "TABLE",
    name: "VIP Airport Assistance",
    defaultInclude: false,
    price: 1500,
  },
  {
    id: "A8",
    tenantId: "T3",
    category: "TOLL_ROAD",
    type: "TOLL",
    name: "Salik Toll Integration",
    defaultInclude: true,
    price: 0,
  },
];

export const useAddonStore = create<AddonStore>()(
  persist(
    (set, get) => ({
      addons: SEED_ADDONS,
      addAddon: (addon) => {
        set((state) => ({
          addons: [...state.addons, { ...addon, id: id() }],
        }));
      },
      updateAddon: (aid, updates) => {
        set((state) => ({
          addons: state.addons.map((a) => (a.id === aid ? { ...a, ...updates } : a)),
        }));
      },
      toggleAddon: (aid) => {
        set((state) => ({
          addons: state.addons.map((a) => (a.id === aid ? { ...a, defaultInclude: !a.defaultInclude } : a)),
        }));
      },
      getAddonsByTenant: (tenantId) => {
        return get().addons.filter((a) => a.tenantId === tenantId);
      },
    }),
    {
      name: "ride-addons",
    }
  )
);
