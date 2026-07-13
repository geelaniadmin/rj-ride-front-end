'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Customer } from '../types';
import { encryptedStorage } from '../encryptedStorage';

interface CustomerStore {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  toggleCustomer: (id: string) => void;
  getCustomersByTenant: (tenantId: string) => Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  deduplicateCustomers: () => void;
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

      deduplicateCustomers: () => {
        set((state) => {
          const seen = new Map<string, Customer>();
          // Keep the FIRST entry for each customer name (case-insensitive)
          for (const c of state.customers) {
            const key = c.name.toLowerCase().trim();
            if (!seen.has(key)) {
              seen.set(key, c);
            }
          }
          return { customers: Array.from(seen.values()) };
        });
      },
    }),
    { name: 'ride-customers', storage: createJSONStorage(() => encryptedStorage()) }
  )
);
