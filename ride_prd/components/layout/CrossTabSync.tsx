"use client";

import { useCrossTabSync } from "@/hooks/useCrossTabSync";

/**
 * Wires cross-tab store synchronisation so ride_prd picks up
 * data changes made by the vendor and ops portals in real time.
 */
export function CrossTabSync() {
  useCrossTabSync();
  return null;
}
