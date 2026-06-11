'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tenant } from '@ride/shared';

interface TenantStoreState {
  tenants: Tenant[];
}

interface TenantStoreActions {
  setTenants: (tenants: Tenant[]) => void;
  getTenantById: (id: string) => Tenant | undefined;
}

export const useTenantStore = create<TenantStoreState & TenantStoreActions>()(
  persist(
    (set, get) => ({
      tenants: [],
      setTenants: (tenants) => set({ tenants }),
      getTenantById: (id) => get().tenants.find((t) => t.id === id),
    }),
    { name: 'ride-tenant' }
  )
);
