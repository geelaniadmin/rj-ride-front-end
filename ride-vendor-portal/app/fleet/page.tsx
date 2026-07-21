"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, keys, useLanguageStore, t } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useVendorTrips } from "@/hooks/useVendorTrips";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Truck, Users } from "lucide-react";

type Vehicle = components["schemas"]["Vehicle"];
type Driver = components["schemas"]["Driver"];

const TABS = [
  { id: "vehicles", label: "Vehicles" },
  { id: "drivers", label: "Drivers" },
];

// A vehicle/driver counts as "on trip" while its trip-vehicle is in any live (non-PENDING,
// non-terminal) state. PENDING has no vehicle yet; COMPLETED/CANCELLED/NO_SHOW are done.
const ON_TRIP_STATUSES = new Set([
  "ASSIGNED",
  "DRIVER_ACCEPTED",
  "EN_ROUTE_PICKUP",
  "AT_PICKUP",
  "PAX_PICKED",
  "IN_TRANSIT",
  "AT_DROP",
  "PAX_DROPPED",
  "BREAKDOWN",
  "ACCIDENT",
  "VEHICLE_SWAP",
  "DELAYED",
  "SOS",
]);

/** Sets of vehicle ids and driver ids currently committed to a live trip. */
function useOnTripSets(): { vehicleIds: Set<string>; driverIds: Set<string> } {
  const { data: trips = [] } = useVendorTrips();
  return useMemo(() => {
    const vehicleIds = new Set<string>();
    const driverIds = new Set<string>();
    for (const trip of trips) {
      for (const tv of trip.vehicles ?? []) {
        if (ON_TRIP_STATUSES.has(tv.status)) {
          if (tv.vehicle) vehicleIds.add(tv.vehicle);
          if (tv.driver) driverIds.add(tv.driver);
        }
      }
    }
    return { vehicleIds, driverIds };
  }, [trips]);
}

function FleetStatusBadge({ isActive, onTrip }: { isActive: boolean; onTrip: boolean }) {
  if (isActive === false) return <StatusBadge status="OFFLINE" />;
  return <StatusBadge status={onTrip ? "ON_TRIP" : "AVAILABLE"} />;
}

function VehiclesTab({ onTripIds }: { onTripIds: Set<string> }) {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: keys.fleet.vehicles.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles", {});
      if (err) throw err;
      return (res?.results ?? []) as Vehicle[];
    },
  });

  if (isLoading) return <div className="text-center py-8 text-text-muted text-sm">Loading vehicles…</div>;
  if (vehicles.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <Truck className="w-10 h-10 text-text-muted mx-auto" />
      <p className="text-text-muted text-sm">No vehicles found</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="bg-card-bg border border-card-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-brand-blue" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary font-mono">{vehicle.plate}</span>
                  <FleetStatusBadge isActive={vehicle.is_active !== false} onTrip={onTripIds.has(vehicle.id)} />
                </div>
                {vehicle.vehicle_type_name && (
                  <p className="text-sm text-text-muted">{vehicle.vehicle_type_name}</p>
                )}
              </div>
            </div>
            <span className="text-xs font-mono text-text-muted">{vehicle.id.substring(0, 8)}…</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DriversTab({ onTripIds }: { onTripIds: Set<string> }) {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: keys.fleet.drivers.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/drivers", {});
      if (err) throw err;
      return (res?.results ?? []) as Driver[];
    },
  });

  if (isLoading) return <div className="text-center py-8 text-text-muted text-sm">Loading drivers…</div>;
  if (drivers.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <Users className="w-10 h-10 text-text-muted mx-auto" />
      <p className="text-text-muted text-sm">No drivers found</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {drivers.map((driver) => (
        <div key={driver.id} className="bg-card-bg border border-card-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary">{driver.name}</span>
                  <FleetStatusBadge isActive={driver.is_active !== false} onTrip={onTripIds.has(driver.id)} />
                </div>
                <p className="text-sm text-text-muted font-mono">{driver.phone}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-text-muted">{driver.id.substring(0, 8)}…</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FleetPage() {
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState("vehicles");
  const { vehicleIds, driverIds } = useOnTripSets();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{t("fleet", language)}</h2>
        <p className="text-sm text-text-muted mt-1">Manage your vehicles and drivers</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "vehicles" && <VehiclesTab onTripIds={vehicleIds} />}
      {activeTab === "drivers" && <DriversTab onTripIds={driverIds} />}
    </div>
  );
}
