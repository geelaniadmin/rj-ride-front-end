import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Vendor, ID, VendorInfo } from '../types';
import { id } from '../helpers';
import { encryptedStorage } from '../encryptedStorage';

interface VendorStore {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: ID, updates: Partial<Vendor>) => void;
  toggleVendor: (id: ID) => void;
  getVendorsByTenant: (tenantId: ID) => Vendor[];
}

// Separate store for vendor info (avoids persist conflict with ride_prd)
interface VendorInfoStore {
  vendorInfo: VendorInfo[];
  addVendorInfo: (info: VendorInfo) => void;
  syncFromVendorStore: (vendors: Vendor[]) => void;
  getVendorName: (vendorId: string) => string;
  getVendorInfo: (vendorId: string) => VendorInfo | undefined;
}

const DEFAULT_VENDORS: Vendor[] = [
  { id: 'V1', tenantId: 'T1', name: 'Apex Fleet', type: 'SELF', active: true, token: 'sk_vendor_V1_demo123' },
  { id: 'V2', tenantId: 'T1', name: 'Urban Drivers Co', type: 'SELF', active: true, token: 'sk_vendor_V2_demo456' },
];

const DEFAULT_VENDOR_INFO: VendorInfo[] = [
  { vendorId: 'V1', name: 'Apex Fleet', token: 'sk_vendor_V1_demo123', active: true },
  { vendorId: 'V2', name: 'Urban Drivers Co', token: 'sk_vendor_V2_demo456', active: true },
];

export const useVendorStore = create<VendorStore>()(
  persist(
    (set, get) => ({
      vendors: [...DEFAULT_VENDORS],
      addVendor: (vendor) => {
        const newId = id();
        const token = `sk_vendor_${newId.slice(0, 8)}_${crypto.randomUUID().slice(0, 8)}`;
        // Also create a VendorInfo entry for backward compatibility
        useVendorInfoStore.getState().addVendorInfo({
          vendorId: newId,
          name: vendor.name,
          token,
          active: true,
        });
        set((state) => ({ vendors: [...state.vendors, { ...vendor, id: newId, token }] }));
      },
      updateVendor: (vid, updates) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, ...updates } : v)),
        }));
      },
      toggleVendor: (vid) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, active: !v.active } : v)),
        }));
      },
      getVendorsByTenant: (tenantId) => get().vendors.filter((v) => v.tenantId === tenantId),
    }),
    {
      name: 'ride-vendors',
      storage: createJSONStorage(() => encryptedStorage()),
      merge: (persisted, initial) => {
        // Zustand persist unwraps { state, version } before calling merge,
        // so persisted is already the unwrapped state (e.g. { vendors: [...] })
        const persistedState = persisted as { vendors?: Vendor[] };
        const persistedVendors = persistedState?.vendors || [];
        // Always include DEFAULT_VENDORS first, then append any extras from storage
        const merged = [...DEFAULT_VENDORS];
        for (const v of persistedVendors) {
          if (!merged.find((m) => m.id === v.id)) {
            merged.push(v);
          }
        }
        return { ...initial, vendors: merged };
      },
    }
  )
);

export const useVendorInfoStore = create<VendorInfoStore>()(
  persist(
    (set, get) => ({
      vendorInfo: DEFAULT_VENDOR_INFO,
      addVendorInfo: (info) => {
        set((state) => ({
          vendorInfo: [...state.vendorInfo, info],
        }));
      },
      syncFromVendorStore: (vendors) => {
        set((state) => {
          const existingIds = new Set(state.vendorInfo.map((v) => v.vendorId));
          const missing = vendors
            .filter((v) => !existingIds.has(v.id))
            .map((v) => ({
              vendorId: v.id,
              name: v.name,
              token: `sk_vendor_${v.id.slice(0, 8)}_${crypto.randomUUID().slice(0, 8)}`,
              active: true,
            }));
          if (missing.length === 0) return state;
          return { vendorInfo: [...state.vendorInfo, ...missing] };
        });
      },
      getVendorName: (vendorId) => get().vendorInfo.find((v) => v.vendorId === vendorId)?.name || vendorId,
      getVendorInfo: (vendorId) => get().vendorInfo.find((v) => v.vendorId === vendorId),
    }),
    { name: 'ride-vendor-info', storage: createJSONStorage(() => encryptedStorage()) }
  )
);
