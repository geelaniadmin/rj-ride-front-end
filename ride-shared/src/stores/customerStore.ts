'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer } from '../types';

interface CustomerStore {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  toggleCustomer: (id: string) => void;
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

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id);
      },
    }),
    { name: 'ride-customers' }
  )
);
