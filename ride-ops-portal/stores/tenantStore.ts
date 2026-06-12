'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tenant } from '@ride/shared';

interface TenantStoreState {
  tenants: Tenant[];
}

interface TenantStoreActions {
  setTenants: (tenants: Tenant[]) => void;
  addTenant: (tenant: Omit<Tenant, 'id'>) => string;
  updateTenant: (id: string, updates: Partial<Omit<Tenant, 'id'>>) => void;
  getTenantById: (id: string) => Tenant | undefined;
}

export const useTenantStore = create<TenantStoreState & TenantStoreActions>()(
  persist(
    (set, get) => ({
      tenants: [],
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
    { name: 'ride-ops-tenant' }
  )
);
