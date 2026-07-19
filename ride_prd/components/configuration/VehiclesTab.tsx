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
      return res?.result ?? [];
    },
  });

  const { data: vehicleTypesData } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const allVehicles: ApiVehicle[] = vehiclesData ?? [];
  const vts = vehicleTypesData ?? [];

  const vehicles = searchQuery.trim()
    ? allVehicles.filter(
        (v) =>
          v.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.model?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVehicles;

  const expiredDocs = 0;
  const expiringSoonDocs = 0;

  const columns: Column[] = [
    { key: "registrationNo", header: t("registration", language), sortable: true },
    {
      key: "make",
      header: t("makeModel", language),
      sortable: true,
      render: (val, row): React.ReactNode => {
        const vehicle = row as unknown as ApiVehicle;
        return `${val as string} ${vehicle?.model ?? ""}`;
      },
    },
    {
      key: "vehicleTypeId",
      header: t("type", language),
      render: (val): React.ReactNode => {
        const typeId = val as string | undefined;
        return vts.find((v) => v.id === typeId)?.name ?? t("dash", language);
      },
    },
    {
      key: "active",
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

      <HealthStrip expiredCount={expiredDocs} expiringCount={expiringSoonDocs} />

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
              {vehicle.make} {vehicle.model} ({vehicle.registrationNo})
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

VehiclesTab.displayName = "VehiclesTab";
