"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, keys, formatMoney } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PII } from "@/components/ui/PII";
import { StateTransitionManager } from "@/components/trips/StateTransitionManager";
import { MapPin, Clock, Users, CreditCard, Activity } from "lucide-react";

type TripDetail = components["schemas"]["TripDetail"];
type TripStop = components["schemas"]["TripStop"];
type TripVehicle = components["schemas"]["TripVehicle"];
type TripEvent = components["schemas"]["TripEvent"];

interface TripDetailViewProps {
  tripId: string;
}

const STOP_TYPE_ICON: Record<string, string> = {
  PICKUP: "🟢",
  DROP: "🔴",
  WAYPOINT: "🔵",
};

const LOCATION_TYPE_BADGE: Record<string, string> = {
  AIRPORT: "✈",
  RAIL: "🚂",
  HOTEL: "🏨",
  CITY: "🏙",
  ADDRESS: "📍",
};

export const TripDetailView: React.FC<TripDetailViewProps> = ({ tripId }) => {
  const { data: trip, isLoading, error } = useQuery<TripDetail>({
    queryKey: keys.trips.detail(tripId),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/trips/{id}", {
        params: { path: { id: tripId } },
      });
      if (err) throw err;
      return res!.result as unknown as TripDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-text-secondary">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
        Loading trip…
      </div>
    );
  }

  if (error || !trip) {
    return (
      <Card padding="lg" className="text-center text-danger py-8">
        <p>Failed to load trip details.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={trip.status} />
            <span className="text-xs text-text-secondary font-mono">{trip.id}</span>
            {trip.reference && <span className="text-xs text-text-secondary">ref: {trip.reference}</span>}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Created {new Date(trip.createdAt).toLocaleString()}
            {trip.createdVia && ` via ${trip.createdVia}`}
          </p>
        </div>
      </div>

      <Card padding="md" header={
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Stops
        </h3>
      }>
        <ol className="space-y-2">
          {(trip.stops as TripStop[]).map((stop) => (
            <li key={stop.seq} className="flex items-start gap-3">
              <span className="text-lg leading-none pt-0.5">{STOP_TYPE_ICON[stop.type] ?? "•"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{stop.address}</p>
                  <span className="text-xs">{LOCATION_TYPE_BADGE[stop.locationType]}</span>
                </div>
                <div className="text-xs text-text-secondary flex flex-wrap gap-2 mt-0.5">
                  {stop.plannedTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(stop.plannedTime).toLocaleString()}
                    </span>
                  )}
                  {stop.flightNumber && <span>✈ {stop.flightNumber}</span>}
                  {stop.trainNumber && <span>🚂 {stop.trainNumber}</span>}
                  {stop.terminal && <span>Terminal: {stop.terminal}</span>}
                </div>
              </div>
              <Badge variant="default" className="text-xs shrink-0">{stop.type}</Badge>
            </li>
          ))}
        </ol>
      </Card>

      <Card padding="md" header={
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Vehicles
        </h3>
      }>
        <div className="space-y-3">
          {(trip.vehicles as TripVehicle[]).map((v) => (
            <div key={v.id} className="p-3 rounded border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-mono text-xs text-text-secondary">{v.id.substring(0, 8)}…</span>
                  <span className="ml-2 text-text-secondary">vtid: {v.requestedVehicleTypeId.substring(0, 8)}</span>
                </div>
                <StatusBadge status={v.status} />
              </div>

              {v.lockedPriceMinor != null && v.lockedPriceCurrency && (
                <p className="text-sm font-semibold text-brand-blue">
                  {formatMoney(v.lockedPriceMinor, v.lockedPriceCurrency)}
                  {v.lockedRateCardVersion != null && (
                    <span className="ml-1 text-xs font-normal text-text-secondary">v{v.lockedRateCardVersion}</span>
                  )}
                </p>
              )}

              {v.pax && v.pax.length > 0 && (
                <div className="text-xs text-text-secondary flex items-center gap-1">
                  <Users className="w-3 h-3" /> {v.pax.length} pax
                </div>
              )}

              <StateTransitionManager tripId={trip.id} vehicleId={v.id} currentStatus={v.status} />
            </div>
          ))}
        </div>
      </Card>

      {trip.timeline && trip.timeline.length > 0 && (
        <Card padding="md" header={
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Event Timeline
          </h3>
        }>
          <ol className="relative border-l border-border pl-4 space-y-3">
            {(trip.timeline as TripEvent[]).map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.125rem] top-0.5 w-3 h-3 rounded-full bg-ops-sidebar border-2 border-border" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-text-primary">{ev.type}</p>
                    {ev.actorRole && (
                      <p className="text-xs text-text-secondary">{ev.actorRole}</p>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary shrink-0">
                    {new Date(ev.occurredAt).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
};

TripDetailView.displayName = "TripDetailView";
