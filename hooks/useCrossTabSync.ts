"use client";

import {
  useTripStore,
  useDriverStore,
  useVehicleStore,
  useVendorStore,
  useVehicleTypeStore,
  useVendorInfoStore,
} from "@ride/shared";
import { useStorageSync } from "./useStorageSync";

/**
 * Syncs all shared Zustand stores across browser tabs.
 * When the admin portal (or another tab) modifies shared data,
 * this hook picks up the localStorage change and updates the store in real time.
 *
 * Call once in the root layout.
 */
export function useCrossTabSync() {
  // Shared stores — data originates in the admin portal (ride_prd)
  useStorageSync("ride-trips", useTripStore);
  useStorageSync("ride-drivers", useDriverStore);
  useStorageSync("ride-vehicles", useVehicleStore);
  useStorageSync("ride-vendors", useVendorStore);
  useStorageSync("ride-vehicle-types", useVehicleTypeStore);
  useStorageSync("ride-vendor-info", useVendorInfoStore);
}
