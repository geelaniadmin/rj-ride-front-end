"use client";

import { useMemo } from "react";
import { useVehicleStore, useDriverStore, useAlertStore } from "@ride/shared";
import type { VendorAlert } from "@ride/shared";

export function useFleetAlerts(vendorId: string) {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const drivers = useDriverStore((s) => s.drivers);
  const storeAlerts = useAlertStore((s) => s.alerts);

  const computedAlerts = useMemo(() => {
    const result: VendorAlert[] = [];

    const vendorVehicles = vehicles.filter((v) => v.ownerVendorId === vendorId && v.active);
    const vendorDrivers = drivers.filter((d) => d.vendorId === vendorId && d.active);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check vehicle documents
    for (const vehicle of vendorVehicles) {
      for (const doc of vehicle.documents) {
        if (!doc.expiry) continue;
        const expiryDate = new Date(doc.expiry);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysRemaining < 0) {
          result.push({
            id: `veh-doc-expired-${vehicle.id}-${doc.kind}`,
            vendorId,
            severity: "HIGH",
            type: "DOC_EXPIRY",
            message: `${doc.kind.replace(/_/g, " ")} expired for ${vehicle.registrationNo} (${Math.abs(daysRemaining)} days ago)`,
            entityId: vehicle.id,
            entityType: "vehicle",
            daysRemaining,
            read: false,
            createdAt: now.toISOString(),
          });
        } else if (daysRemaining <= 30) {
          result.push({
            id: `veh-doc-${vehicle.id}-${doc.kind}`,
            vendorId,
            severity: daysRemaining <= 7 ? "HIGH" : "MEDIUM",
            type: "DOC_EXPIRY",
            message: `${doc.kind.replace(/_/g, " ")} for ${vehicle.registrationNo} expires in ${daysRemaining} days`,
            entityId: vehicle.id,
            entityType: "vehicle",
            daysRemaining,
            read: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    // Check driver documents
    for (const driver of vendorDrivers) {
      for (const doc of driver.documents) {
        if (!doc.expiry) continue;
        const expiryDate = new Date(doc.expiry);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysRemaining < 0) {
          result.push({
            id: `drv-doc-expired-${driver.id}-${doc.kind}`,
            vendorId,
            severity: "HIGH",
            type: "DOC_EXPIRY",
            message: `${doc.kind.replace(/_/g, " ")} expired for ${driver.name} (${Math.abs(daysRemaining)} days ago)`,
            entityId: driver.id,
            entityType: "driver",
            daysRemaining,
            read: false,
            createdAt: now.toISOString(),
          });
        } else if (daysRemaining <= 30) {
          result.push({
            id: `drv-doc-${driver.id}-${doc.kind}`,
            vendorId,
            severity: daysRemaining <= 7 ? "HIGH" : "MEDIUM",
            type: "DOC_EXPIRY",
            message: `${doc.kind.replace(/_/g, " ")} for ${driver.name} expires in ${daysRemaining} days`,
            entityId: driver.id,
            entityType: "driver",
            daysRemaining,
            read: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    return result;
  }, [vehicles, drivers, vendorId]);

  // Merge computed alerts with store alerts, dedup by id
  const allAlerts = useMemo(() => {
    const storeAlertsForVendor = storeAlerts.filter((a) => a.vendorId === vendorId);
    const computedIds = new Set(computedAlerts.map((a) => a.id));
    const dedupedStore = storeAlertsForVendor.filter((a) => !computedIds.has(a.id));
    // Sort: HIGH first, then MEDIUM, then LOW, then by createdAt desc
    return [...computedAlerts, ...dedupedStore].sort((a, b) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [computedAlerts, storeAlerts, vendorId]);

  return {
    computedAlerts: allAlerts,
    highCount: allAlerts.filter((a) => a.severity === "HIGH").length,
    mediumCount: allAlerts.filter((a) => a.severity === "MEDIUM").length,
    lowCount: allAlerts.filter((a) => a.severity === "LOW").length,
  };
}
