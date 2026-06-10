"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSessionStore, useVendorInfoStore, useDriverStore } from "@ride/shared";
import { useVendorTrips } from "@/hooks/useVendorTrips";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PiiField } from "@/components/ui/PiiField";
import { CalendarCheck, Truck, Users, DollarSign, ArrowRight, Clock } from "lucide-react";

export default function DashboardPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const getVendorName = useVendorInfoStore((s) => s.getVendorName);

  if (!vendorSession) return null;

  const {
    tripsToday,
    activeNow,
    driversOnDuty,
    earningsToday,
    needingAttention,
    activeTrips,
    recentEvents,
  } = useVendorTrips(vendorSession.vendorId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Welcome back, {getVendorName(vendorSession.vendorId)}
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Real-time data shared with admin portal — no page refresh needed
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Trips Today" value={tripsToday} icon={CalendarCheck} accentColor="text-brand-blue" />
        <KpiCard label="Active Now" value={activeNow} icon={Truck} accentColor="text-success" />
        <KpiCard label="Drivers on Duty" value={driversOnDuty} icon={Users} accentColor="text-warning" />
        <KpiCard label="Earnings Today" value={`₹${earningsToday}`} icon={DollarSign} accentColor="text-brand-blue" />
      </div>

      {/* Trips columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trips Needing Attention */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              Trips Needing Attention
              {needingAttention.length > 0 && (
                <span className="bg-danger text-white text-xs px-1.5 py-0.5 rounded-full">{needingAttention.length}</span>
              )}
            </h3>
            <Link href="/trips" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {needingAttention.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No pending trips — you're all caught up ✓</p>
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
                      {trip.status === "ASSIGNED" ? "Accept / Decline" : "View"}
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
              Active Trips
            </h3>
            <Link href="/trips" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {activeTrips.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No active trips right now</p>
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
                    Track
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-text-primary mb-4">Recent Activity</h3>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-3">No recent activity</p>
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
