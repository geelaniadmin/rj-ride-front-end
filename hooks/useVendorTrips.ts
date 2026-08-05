"use client";

import { useMemo } from "react";
import { useTripStore, useDriverStore, useVehicleStore, useVehicleTypeStore } from "@ride/shared";
import type { VehicleStatus, LocationType } from "@ride/shared";

export interface VendorTrip {
  tripId: string;
  vendorId: string;
  customerId: string;
  vehicleType: string;
  stops: import("@ride/shared").Stop[];
  lockedPrice: number;
  lockedRateCardVersion: number;
  priceId: string;
  scheduledAt: string;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  status: VehicleStatus;
  createdAt: string;
  vehicleIndex: number;
  vendorDeclineLog?: Array<{ vendorId: string; reason: string; declinedAt: string }>;
}

export function useVendorTrips(vendorId: string) {
  const trips = useTripStore((s) => s.trips);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const drivers = useDriverStore((s) => s.drivers);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const eventLog = useTripStore((s) => s.eventLog);

  // Flatten the convoy model: each TripVehicle becomes a VendorTrip
  const vendorTrips = useMemo(() => {
    const result: VendorTrip[] = [];

    for (const trip of trips) {
      // Find vehicles that belong to this vendor (by matching a vehicle's ownerVendorId)
      trip.vehicles.forEach((tv, vehicleIndex) => {
        const vehicle = vehicles.find((v) => v.id === tv.vehicleId);
        const isVendorVehicle = vehicle?.ownerVendorId === vendorId;

        // Also match by driver vendorId
        const driver = drivers.find((d) => d.id === tv.driverId);
        const isVendorDriver = driver?.vendorId === vendorId;

        // Also match by direct vendorId on TripVehicle (set during trip creation)
        const isDirectVendorMatch = tv.vendorId === vendorId;

        // If this vehicle belongs to the vendor or has a driver from this vendor or was created for this vendor
        if (isVendorVehicle || isVendorDriver || isDirectVendorMatch) {
          const vt = vehicleTypes.find((vtc) => vtc.id === tv.requestedVehicleTypeId);
          result.push({
            tripId: trip.id,
            vendorId,
            customerId: trip.customerId,
            vehicleType: vt?.name || "Sedan",
            stops: trip.stops,
            lockedPrice: tv.lockedPrice || 0,
            lockedRateCardVersion: tv.lockedRateCardVersion || 1,
            priceId: tv.priceId || "",
            scheduledAt: trip.schedule.type === "ONE_OFF" ? trip.schedule.when || trip.createdAt : trip.createdAt,
            assignedDriverId: tv.driverId,
            assignedVehicleId: tv.vehicleId,
            status: tv.status,
            createdAt: trip.createdAt,
            vehicleIndex,
            vendorDeclineLog: trip.vendorDeclineLog,
          });
        }
      });
    }

    // Sort by createdAt descending (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [trips, vehicles, drivers, vehicleTypes, vendorId]);

  // Derived KPIs
  const today = new Date().toDateString();
  const tripsToday = vendorTrips.filter((t) => new Date(t.createdAt).toDateString() === today);
  const activeNow = vendorTrips.filter((t) => ["EN_ROUTE_PICKUP", "AT_DROP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT"].includes(t.status));
  const driversOnDuty = drivers.filter((d) => d.vendorId === vendorId && d.available && d.active);
  const earningsToday = vendorTrips
    .filter((t) => t.status === "COMPLETED" && new Date(t.createdAt).toDateString() === today)
    .reduce((sum, t) => sum + Math.round(t.lockedPrice * 0.85), 0); // net = lockedPrice - 15%

  const needingAttention = vendorTrips.filter((t) => t.status === "ASSIGNED");
  const activeTrips = vendorTrips.filter((t) =>
    ["EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"].includes(t.status)
  );

  // Recent events for this vendor
  const recentEvents = eventLog.filter((e) => e.vendorId === vendorId).slice(0, 10);

  return {
    vendorTrips,
    tripsToday: tripsToday.length,
    activeNow: activeNow.length,
    driversOnDuty: driversOnDuty.length,
    earningsToday,
    needingAttention,
    activeTrips,
    recentEvents,
  };
}
