"use client";

import { useEffect } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useDriverStore } from "@/stores/driverStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useTenantStore } from "@/stores/tenantStore";

interface PersistStore {
  persist: { rehydrate: () => void };
}

const STORE_MAP: Record<string, PersistStore> = {
  "ride-trips": useTripStore,
  "ride-drivers": useDriverStore,
  "ride-vehicles": useVehicleStore,
  "ride-vehicle-types": useVehicleTypeStore,
  "ride-customers": useCustomerStore,
  "ride-vendors": useVendorStore,
  "ride-rate-cards": useRateCardStore,
  "ride-tenant": useTenantStore,
};

/**
 * Syncs ride_prd's stores when the vendor/ops portals modify shared data
 * in localStorage. Uses the native `storage` event which fires in other
 * tabs when localStorage changes.
 *
 * Call once in the root layout.
 */
export function useCrossTabSync() {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      const store = STORE_MAP[e.key];
      if (store) {
        store.persist.rehydrate();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
}
