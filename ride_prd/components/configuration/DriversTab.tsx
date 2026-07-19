"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { HealthStrip } from "@/components/configuration/HealthStrip";

type ApiDriver = components["schemas"]["Driver"];

interface DriversTabProps {
  searchQuery?: string;
}

export const DriversTab: React.FC<DriversTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);

  const { data, isLoading, error } = useQuery({
    queryKey: keys.fleet.drivers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/drivers");
      if (err) throw err;
      return res;
    },
  });

  const allDrivers: ApiDriver[] = (data as { results?: ApiDriver[] } | undefined)?.results ?? (data as ApiDriver[] | undefined) ?? [];
  const drivers = searchQuery.trim()
    ? allDrivers.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.phone.includes(searchQuery)
      )
    : allDrivers;

  const columns: Column[] = [
    {
      key: "name",
      header: t("driverName", language),
      sortable: true,
      render: (val): React.ReactNode => <PII value={val as string} type="name" />,
    },
    {
      key: "phone",
      header: t("phone", language),
      render: (val): React.ReactNode => <PII value={val as string} type="phone" />,
    },
    {
      key: "status",
      header: t("status", language),
      render: (val): React.ReactNode => (
        <Badge variant={val === "AVAILABLE" ? "green" : val === "ON_TRIP" ? "blue" : "red"}>
          {val as string}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Active",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>
          {val ? t("active", language) : t("inactive", language)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("drivers", language)} ({drivers.length})
        </h3>
      </div>

      <HealthStrip expiredCount={0} expiringCount={0} />

      <QueryBoundary
        isLoading={isLoading}
        error={error}
        isEmpty={drivers.length === 0}
        emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noDrivers", language)}</p>}
      >
        <DataTable
          columns={columns}
          data={drivers as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noDrivers", language)}
        />
      </QueryBoundary>

      {drivers.map((driver) => (
        <div key={driver.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="font-medium text-ops-sidebar">
            <PII value={driver.name} type="name" />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            <PII value={driver.phone} type="phone" />
          </p>
        </div>
      ))}
    </div>
  );
};

DriversTab.displayName = "DriversTab";
