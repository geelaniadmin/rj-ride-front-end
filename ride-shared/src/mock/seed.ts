import { useVendorStore } from '../stores/vendorStore';
import type { Vendor } from '../types';

const SEED_VENDORS: Omit<Vendor, 'id'>[] = [
  {
    tenantId: 'T1',
    name: 'Apex Fleet',
    type: 'SELF',
    active: true,
  },
  {
    tenantId: 'T1',
    name: 'Urban Drivers Co',
    type: 'SELF',
    active: true,
  },
];

/**
 * Seeds vendors into the shared vendor store.
 * Safe to call multiple times — skips if vendors already exist.
 */
export function seedVendors(): void {
  const state = useVendorStore.getState();
  if (state.vendors.length > 0) return;
  for (const v of SEED_VENDORS) {
    state.addVendor(v);
  }
}
