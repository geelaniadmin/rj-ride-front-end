"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSessionStore, useVendorInfoStore, useDriverStore, useLanguageStore, t } from "@ride/shared";
import { useVendorTrips } from "@/hooks/useVendorTrips";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PiiField } from "@/components/ui/PiiField";
import { CalendarCheck, Truck, Users, DollarSign, ArrowRight, Clock, Bell, CircleDollarSign, Percent } from "lucide-react";

export default function DashboardPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const getVendorName = useVendorInfoStore((s) => s.getVendorName);
  const language = useLanguageStore((s) => s.language);

  if (!vendorSession) return null;

  const vendorId = vendorSession.vendorId;
  const drivers = useDriverStore((s) => s.drivers);

  const {
    vendorTrips,
    tripsToday,
    activeNow,
    driversOnDuty,
    earningsToday,
    needingAttention,
    activeTrips,
    recentEvents,
  } = useVendorTrips(vendorId);

  // Fleet status bar
  const vendorDrivers = useMemo(
    () => drivers.filter((d) => d.vendorId === vendorId),
    [drivers, vendorId]
  );
  const totalDrivers = vendorDrivers.length;
  const availableDrivers = vendorDrivers.filter((d) => d.available && d.active).length;
  const onTripDrivers = vendorDrivers.filter((d) => !d.available && d.active).length;
  const offlineDrivers = vendorDrivers.filter((d) => !d.active).length;

  const availablePct = totalDrivers > 0 ? Math.round((availableDrivers / totalDrivers) * 100) : 0;
  const onTripPct = totalDrivers > 0 ? Math.round((onTripDrivers / totalDrivers) * 100) : 0;
  const offlinePct = totalDrivers > 0 ? Math.round((offlineDrivers / totalDrivers) * 100) : 0;

  // Acceptance rate KPI
  const acceptedCount = vendorTrips.filter((t) =>
    ["DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP", "PAX_DROPPED", "COMPLETED"].includes(t.status)
  ).length;
  const totalResponded = acceptedCount + vendorTrips.filter((t) => t.status === "CANCELLED").length;
  const acceptanceRate = totalResponded > 0 ? Math.round((acceptedCount / totalResponded) * 100) : 0;

  const acceptanceColor =
    acceptanceRate >= 90 ? "text-success" : acceptanceRate >= 70 ? "text-warning" : "text-danger";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          {t("welcomeBack", language)}, {getVendorName(vendorId)}
        </h2>
        <p className="text-sm text-text-muted mt-1">
          {t("realtimeDataShared", language)}
        </p>
      </div>

      {/* KPI Cards - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label={t("tripsToday", language)} value={tripsToday} icon={CalendarCheck} accentColor="text-brand-blue" />
        <KpiCard label={t("activeNow", language)} value={activeNow} icon={Truck} accentColor="text-success" />
        <KpiCard label={t("driversOnDuty", language)} value={driversOnDuty} icon={Users} accentColor="text-warning" />
        <KpiCard label={t("earningsToday", language)} value={`₹${earningsToday}`} icon={DollarSign} accentColor="text-brand-blue" />
        <KpiCard
          label={t("acceptanceRate", language)}
          value={`${totalResponded > 0 ? acceptanceRate : "—"}${totalResponded > 0 ? "%" : ""}`}
          icon={Percent}
          accentColor={acceptanceColor}
        />
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/trips?status=ASSIGNED"
          className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-card-border rounded-xl hover:shadow-md hover:border-brand-blue/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("pendingTrips", language)}</p>
            <p className="text-xs text-text-muted">{needingAttention.length} {t("awaitingAction", language)}</p>
          </div>
        </Link>

        <Link
          href="/trips"
          className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-card-border rounded-xl hover:shadow-md hover:border-brand-blue/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
            <Truck className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("activeTrips", language)}</p>
            <p className="text-xs text-text-muted">{activeTrips.length} {t("inProgress", language)}</p>
          </div>
        </Link>

        <Link
          href="/alerts"
          className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-card-border rounded-xl hover:shadow-md hover:border-brand-blue/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center group-hover:bg-danger/20 transition-colors">
            <Bell className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("alerts", language)}</p>
            <p className="text-xs text-text-muted">{t("viewAlerts", language)}</p>
          </div>
        </Link>

        <Link
          href="/earnings"
          className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-card-border rounded-xl hover:shadow-md hover:border-brand-blue/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
            <CircleDollarSign className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("earnings", language)}</p>
            <p className="text-xs text-text-muted">{t("viewRevenue", language)}</p>
          </div>
        </Link>
      </div>

      {/* Fleet Status Bar */}
      {totalDrivers > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" />
              {t("fleetStatus", language)}
            </h3>
            <span className="text-xs text-text-muted">
              {availableDrivers} {t("of", language)} {totalDrivers} {t("drivers", language)} {t("available", language).toLowerCase()}
            </span>
          </div>

          {/* Segmented bar */}
          <div className="h-4 w-full rounded-full overflow-hidden flex">
            {availableDrivers > 0 && (
              <div
                className="bg-success transition-all duration-500"
                style={{ width: `${availablePct}%` }}
                title={`${availableDrivers} ${t("available", language)} (${availablePct}%)`}
              />
            )}
            {onTripDrivers > 0 && (
              <div
                className="bg-warning transition-all duration-500"
                style={{ width: `${onTripPct}%` }}
                title={`${onTripDrivers} ${t("onTrip", language)} (${onTripPct}%)`}
              />
            )}
            {offlineDrivers > 0 && (
              <div
                className="bg-text-muted transition-all duration-500"
                style={{ width: `${offlinePct}%` }}
                title={`${offlineDrivers} ${t("offline", language)} (${offlinePct}%)`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span>{t("available", language)} ({availableDrivers})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span>{t("onTrip", language)} ({onTripDrivers})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-text-muted" />
              <span>{t("offline", language)} ({offlineDrivers})</span>
            </div>
          </div>
        </div>
      )}

      {/* Trips columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trips Needing Attention */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              {t("tripsNeedingAttention", language)}
              {needingAttention.length > 0 && (
                <span className="bg-danger text-white text-xs px-1.5 py-0.5 rounded-full">{needingAttention.length}</span>
              )}
            </h3>
            <Link href="/trips" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
              {t("view", language)} {t("all", language)} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {needingAttention.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">{t("noPendingTrips", language)} ✓</p>
          ) : (
            <div className="space-y-2">
              {needingAttention.slice(0, 5).map((trip) => (
                <div key={trip.tripId} className="flex items-center justify-between bg-ops-bg p-3 rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-text-muted">{trip.tripId.slice(0, 8)}</span>
                      <StatusBadge status={trip.status} />
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {trip.stops[0]?.address || "?"} → {trip.stops[1]?.address || "?"}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold">₹{Math.round(trip.lockedPrice)}</p>
                    <Link
                      href={`/trips`}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      {trip.status === "ASSIGNED" ? `${t("accept", language)} / ${t("decline", language)}` : t("view", language)}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Trips */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Truck className="w-4 h-4 text-success" />
              {t("activeTrips", language)}
            </h3>
            <Link href="/trips" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
              {t("view", language)} {t("all", language)} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {activeTrips.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">{t("noActiveTrips", language)}</p>
          ) : (
            <div className="space-y-2">
              {activeTrips.slice(0, 5).map((trip) => (
                <div key={trip.tripId} className="flex items-center justify-between bg-ops-bg p-3 rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-text-muted">{trip.tripId.slice(0, 8)}</span>
                      <StatusBadge status={trip.status} />
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {trip.stops[0]?.address || "?"} → {trip.stops[1]?.address || "?"}
                    </p>
                  </div>
                  <Link
                    href="/trips"
                    className="text-xs text-brand-blue hover:underline shrink-0 ml-4"
                  >
                    {t("track", language)}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-text-primary mb-4">{t("recentActivity", language)}</h3>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-3">{t("noRecentActivity", language)}</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 text-sm text-text-secondary py-1">
                <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                <span className="capitalize text-xs font-medium">{event.type.replace(/_/g, " ")}</span>
                <span className="text-xs text-text-muted">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
