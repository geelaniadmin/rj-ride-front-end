"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, keys, useLanguageStore, t } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Truck, Users } from "lucide-react";

type Vehicle = components["schemas"]["Vehicle"];
type Driver = components["schemas"]["Driver"];

const TABS = [
  { id: "vehicles", label: "Vehicles" },
  { id: "drivers", label: "Drivers" },
];


function VehiclesTab() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: keys.fleet.vehicles.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles", {});
      if (err) throw err;
      return (res?.result ?? []) as Vehicle[];
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
                  <span className="font-semibold text-text-primary font-mono">{vehicle.registrationNo}</span>
                  {vehicle.active === false ? (
                    <StatusBadge status="OFFLINE" />
                  ) : (
                    <StatusBadge status="AVAILABLE" />
                  )}
                </div>
                {(vehicle.make || vehicle.model) && (
                  <p className="text-sm text-text-muted">{vehicle.make} {vehicle.model}</p>
                )}
                {vehicle.vehicleTypeId && (
                  <p className="text-xs text-text-muted font-mono">Type: {vehicle.vehicleTypeId}</p>
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

function DriversTab() {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: keys.fleet.drivers.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/drivers", {});
      if (err) throw err;
      return (res?.result ?? []) as Driver[];
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
                  {driver.available === false || driver.active === false ? (
                    <StatusBadge status="OFFLINE" />
                  ) : (
                    <StatusBadge status="AVAILABLE" />
                  )}
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{t("fleet", language)}</h2>
        <p className="text-sm text-text-muted mt-1">Manage your vehicles and drivers</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "vehicles" && <VehiclesTab />}
      {activeTab === "drivers" && <DriversTab />}
    </div>
  );
}
