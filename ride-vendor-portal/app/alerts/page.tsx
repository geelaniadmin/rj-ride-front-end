"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, keys, useLanguageStore, t } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Bell, AlertCircle, CheckCircle, Truck, Users } from "lucide-react";

type Vehicle = components["schemas"]["Vehicle"];
type Driver = components["schemas"]["Driver"];

type LocalAlert = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
  entityType: "vehicle" | "driver";
  daysRemaining?: number;
};

function computeDocAlerts(vehicles: Vehicle[], drivers: Driver[]): LocalAlert[] {
  const alerts: LocalAlert[] = [];
  for (const v of vehicles) {
    if (v.active === false) {
      alerts.push({
        id: `vehicle-inactive-${v.id}`,
        severity: "MEDIUM",
        title: "Vehicle inactive",
        message: `${v.registrationNo} is currently marked as inactive`,
        entityType: "vehicle",
      });
    }
  }

  for (const d of drivers) {
    if (d.active === false) {
      alerts.push({
        id: `driver-inactive-${d.id}`,
        severity: "LOW",
        title: "Driver inactive",
        message: `${d.name} is currently inactive`,
        entityType: "driver",
      });
    } else if (d.available === false) {
      alerts.push({
        id: `driver-unavailable-${d.id}`,
        severity: "LOW",
        title: "Driver unavailable",
        message: `${d.name} is not currently available`,
        entityType: "driver",
      });
    }
  }

  return alerts.sort((a, b) => {
    const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });
}

function severityStyle(severity: string) {
  if (severity === "HIGH") return "border-danger/30 bg-danger/5";
  if (severity === "MEDIUM") return "border-warning/30 bg-warning/5";
  return "border-border bg-card-bg";
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "HIGH") return <AlertCircle className="w-4 h-4 text-danger" />;
  if (severity === "MEDIUM") return <AlertCircle className="w-4 h-4 text-warning" />;
  return <Bell className="w-4 h-4 text-text-muted" />;
}

export default function AlertsPage() {
  const language = useLanguageStore((s) => s.language);

  const { data: vehicles = [] } = useQuery({
    queryKey: keys.fleet.vehicles.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles", {});
      if (err) throw err;
      return (res?.result ?? []) as Vehicle[];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: keys.fleet.drivers.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/drivers", {});
      if (err) throw err;
      return (res?.result ?? []) as Driver[];
    },
  });

  const alerts = computeDocAlerts(vehicles, drivers);

  const highCount = alerts.filter((a) => a.severity === "HIGH").length;
  const mediumCount = alerts.filter((a) => a.severity === "MEDIUM").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{t("alerts", language)}</h2>
        <p className="text-sm text-text-muted mt-1">Fleet status alerts and document warnings</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl p-4 border ${highCount > 0 ? "bg-danger/5 border-danger/20" : "bg-card-bg border-card-border"}`}>
          <p className="text-xs text-text-muted uppercase tracking-wider">High</p>
          <p className={`text-2xl font-bold mt-1 ${highCount > 0 ? "text-danger" : "text-text-primary"}`}>{highCount}</p>
        </div>
        <div className={`rounded-xl p-4 border ${mediumCount > 0 ? "bg-warning/5 border-warning/20" : "bg-card-bg border-card-border"}`}>
          <p className="text-xs text-text-muted uppercase tracking-wider">Medium</p>
          <p className={`text-2xl font-bold mt-1 ${mediumCount > 0 ? "text-warning" : "text-text-primary"}`}>{mediumCount}</p>
        </div>
        <div className="rounded-xl p-4 border bg-card-bg border-card-border">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{alerts.length}</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-success" />
          </div>
          <p className="text-text-muted text-sm">No alerts — your fleet is in good shape</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl p-4 border ${severityStyle(alert.severity)}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <SeverityIcon severity={alert.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      alert.severity === "HIGH" ? "bg-danger/10 text-danger" :
                      alert.severity === "MEDIUM" ? "bg-warning/10 text-warning" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {alert.severity}
                    </span>
                    <div className="flex items-center gap-1">
                      {alert.entityType === "vehicle" ? (
                        <Truck className="w-3 h-3 text-text-muted" />
                      ) : (
                        <Users className="w-3 h-3 text-text-muted" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
