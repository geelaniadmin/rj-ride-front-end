'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tenant } from '@/lib/types';

const SEED_TENANTS: Tenant[] = [
  {
    id: 'T1',
    name: 'Hubballi Transport Co',
    legalName: 'Hubballi Transport Co Pvt Ltd',
    baseCity: 'Hubballi',
    contractCurrency: 'INR',
  },
  {
    id: 'T2',
    name: 'Bengaluru Rides Pvt Ltd',
    legalName: 'Bengaluru Rides Private Limited',
    baseCity: 'Bengaluru',
    contractCurrency: 'INR',
  },
  {
    id: 'T3',
    name: 'Gulf Express (Demo)',
    legalName: 'Gulf Express International FZCO',
    baseCity: 'Dubai',
    contractCurrency: 'AED',
  },
];

interface TenantStore {
  tenants: Tenant[];
  activeTenantId: string;
  setActiveTenant: (id: string) => void;
  getActiveTenant: () => Tenant | undefined;
  setTenants: (tenants: Tenant[]) => void;
  addTenant: (tenant: Omit<Tenant, 'id'>) => string;
  updateTenant: (id: string, updates: Partial<Omit<Tenant, 'id'>>) => void;
  getTenantById: (id: string) => Tenant | undefined;
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set, get) => ({
      tenants: SEED_TENANTS,
      activeTenantId: 'T1',

      setActiveTenant: (id) => {
        const tenant = get().tenants.find((t) => t.id === id);
        if (tenant) {
          set({ activeTenantId: id });
        }
      },

      getActiveTenant: () => {
        const state = get();
        return state.tenants.find((t) => t.id === state.activeTenantId);
      },

      setTenants: (tenants) => set({ tenants }),

      addTenant: (tenant) => {
        const id = crypto.randomUUID();
        set((state) => ({
          tenants: [...state.tenants, { ...tenant, id } as Tenant],
        }));
        return id;
      },

      updateTenant: (id, updates) => {
        set((state) => ({
          tenants: state.tenants.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      getTenantById: (id) => get().tenants.find((t) => t.id === id),
    }),
    { name: 'ride-tenant' }
  )
);
