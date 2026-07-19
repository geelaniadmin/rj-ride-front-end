"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { HealthStrip } from "@/components/configuration/HealthStrip";

type ApiVehicle = components["schemas"]["Vehicle"];

interface VehiclesTabProps {
  searchQuery?: string;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);

  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: keys.fleet.vehicles.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles");
      if (err) throw err;
      return res;
    },
  });

  const allVehicles: ApiVehicle[] = (vehiclesData as { results?: ApiVehicle[] } | undefined)?.results ?? (vehiclesData as ApiVehicle[] | undefined) ?? [];

  const vehicles = searchQuery.trim()
    ? allVehicles.filter(
        (v) =>
          v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vehicle_type_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVehicles;

  const columns: Column[] = [
    { key: "plate", header: t("registration", language), sortable: true },
    {
      key: "vehicle_type_name",
      header: t("type", language),
      sortable: true,
      render: (val): React.ReactNode => (val as string) || t("dash", language),
    },
    {
      key: "vendor_name",
      header: "Vendor",
      sortable: true,
      render: (val): React.ReactNode => (val as string) || t("dash", language),
    },
    {
      key: "is_active",
      header: t("status", language),
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? t("active", language) : t("inactive", language)}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("vehicles", language)} ({vehicles.length})
        </h3>
      </div>

      <HealthStrip expiredCount={0} expiringCount={0} />

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={vehicles.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noVehicles", language)}</p>}>
        <DataTable
          columns={columns}
          data={vehicles as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noVehicles", language)}
        />
      </QueryBoundary>

      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-ops-sidebar">
              {vehicle.vehicle_type_name} — {vehicle.plate}
            </div>
            <Badge variant={vehicle.is_active ? "green" : "red"}>
              {vehicle.is_active ? t("active", language) : t("inactive", language)}
            </Badge>
          </div>
          {vehicle.vendor_name && (
            <p className="text-xs text-text-secondary">{vehicle.vendor_name}</p>
          )}
        </div>
      ))}
    </div>
  );
};

VehiclesTab.displayName = "VehiclesTab";
