'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  billingCycle?: string; // WEEKLY, FORTNIGHTLY, MONTHLY
  spocName?: string;
  phone?: string;
  email?: string;
  approvedVehicleTypeIds?: string[];
  defaultCostCenter?: string;
  active: boolean;
  createdAt: string;
}

interface CustomerStore {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => string;
  getCustomersByTenant: (tenantId: string) => Customer[];
  getCustomerById: (id: string) => Customer | undefined;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: [],

      setCustomers: (customers) => {
        set({ customers });
      },

      addCustomer: (customer) => {
        const id = crypto.randomUUID();
        set((state) => ({
          customers: [
            ...state.customers,
            {
              ...customer,
              id,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      getCustomersByTenant: (tenantId) => {
        return get().customers.filter((c) => c.tenantId === tenantId);
      },

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id);
      },
    }),
    { name: 'ride-ops-customers' }
  )
);
