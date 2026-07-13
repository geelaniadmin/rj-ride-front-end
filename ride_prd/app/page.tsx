"use client";

import React, { useMemo } from "react";
import { useTenantStore, useLanguageStore, t } from "@ride/shared";
import { useTripStore } from "@/stores/tripStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { Card } from "@/components/ui/Card";
import { AlertCircle, TrendingUp, Truck, Users, Calendar } from "lucide-react";

export default function DashboardPage() {
  const language = useLanguageStore((s) => s.language);
  const { activeTenantId, getActiveTenant } = useTenantStore();
  const tenant = getActiveTenant();

  const allTrips = useTripStore((s) => s.trips) || [];
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const allDrivers = useDriverStore((s) => s.drivers) || [];

  const activeTrips = useMemo(
    () => allTrips.filter((t) => t.tenantId === activeTenantId && ["ASSIGNED", "IN_PROGRESS", "CONFIRMED"].includes(t.status)).length,
    [allTrips, activeTenantId]
  );

  const totalVehicles = useMemo(
    () => allVehicles.filter((v) => v.tenantId === activeTenantId && v.active).length,
    [allVehicles, activeTenantId]
  );

  const driversOnDuty = useMemo(
    () => allDrivers.filter((d) => d.tenantId === activeTenantId && d.available && d.active).length,
    [allDrivers, activeTenantId]
  );

  const todayPickups = useMemo(() => {
    const today = new Date().toISOString().split("T")[0] ?? "";
    return allTrips.filter((t) => {
      if (t.tenantId !== activeTenantId) return false;
      if (t.schedule.type === "ONE_OFF" && t.schedule.when) {
        return t.schedule.when.startsWith(today);
      }
      return false;
    }).length;
  }, [allTrips, activeTenantId]);

  const kpis = [
    { labelKey: "activeTrips" as const, value: activeTrips, icon: TrendingUp },
    { labelKey: "totalVehicles" as const, value: totalVehicles, icon: Truck },
    { labelKey: "driversOnDuty" as const, value: driversOnDuty, icon: Users },
    { labelKey: "todaysPickups" as const, value: todayPickups, icon: Calendar },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-200">{t("prototype", language)}</p>
          <p className="text-sm text-amber-100/80">{t("prototypeMessage", language)}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.labelKey}
              className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    {t(kpi.labelKey, language)}
                  </p>
                  <Icon className="w-5 h-5 text-white/50" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">{t("activeTenant", language)}</h3>}>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-text-secondary">{t("tenantID", language)}:</span> <span className="font-mono text-text-primary font-medium">{activeTenantId}</span>
          </p>
          <p>
            <span className="text-text-secondary">{t("name", language)}:</span> <span className="text-text-primary font-medium">{tenant?.name}</span>
          </p>
          <p>
            <span className="text-text-secondary">{t("baseCity", language)}:</span> <span className="text-text-primary font-medium">{tenant?.baseCity}</span>
          </p>
          <p>
            <span className="text-text-secondary">{t("currency", language)}:</span> <span className="text-text-primary font-medium">{tenant?.contractCurrency}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
