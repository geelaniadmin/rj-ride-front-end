"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, keys, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useRideEvents } from "@ride/shared/realtime/ws";
import type { TrackingEvent } from "@ride/shared/realtime/ws";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { VehicleStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Navigation, AlertCircle, MapPin, MapIcon, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

type LivePosition = components["schemas"]["LivePosition"];
type TrackDetail = components["schemas"]["TrackDetail"];
type TrackMilestone = components["schemas"]["TrackMilestone"];

const LiveMapComponent = dynamic(() => import("@/components/tracking/LiveMapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-ops-bg rounded flex items-center justify-center text-text-secondary text-sm">
      Loading map…
    </div>
  ),
});

export default function TrackingPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [selectedTripVehicleId, setSelectedTripVehicleId] = useState<string | null>(null);

  const livePositionsRef = useRef<Map<string, LivePosition>>(new Map());
  const [positionsTick, setPositionsTick] = useState(0);

  const { data: initialPositions, isLoading } = useQuery<LivePosition[]>({
    queryKey: keys.tracking.live(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/tracking/live", {});
      if (err) throw err;
      return (res?.result ?? []) as LivePosition[];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!initialPositions) return;
    const map = new Map<string, LivePosition>();
    for (const pos of initialPositions) {
      if (pos.tripVehicleId) map.set(pos.tripVehicleId, pos);
    }
    livePositionsRef.current = map;
    setPositionsTick((t) => t + 1);
  }, [initialPositions]);

  const handleTrackingEvent = useCallback(
    (event: TrackingEvent) => {
      const { deviceId, lat, lng, speed, heading, timestamp } = event;
      const map = livePositionsRef.current;
      const existing = Array.from(map.values()).find((p) => p.deviceId === deviceId);
      if (existing?.tripVehicleId) {
        map.set(existing.tripVehicleId, { ...existing, lat, lng, speed, heading, timestamp });
        setPositionsTick((t) => t + 1);
      }
    },
    []
  );

  useRideEvents({
    handler: (event) => {
      if (event.type === "tracking.position") {
        handleTrackingEvent(event as TrackingEvent);
      }
    },
  });

  const { data: trackDetail } = useQuery<TrackDetail | null>({
    queryKey: keys.tracking.track(selectedTripVehicleId ?? ""),
    queryFn: async () => {
      if (!selectedTripVehicleId) return null;
      const { data: res, error: err } = await apiClient.GET("/v1/tracking/{tripVehicleId}/track", {
        params: { path: { tripVehicleId: selectedTripVehicleId } },
      });
      if (err) {
        addToast(isApiError(err) ? (err as { message: string }).message : "Track fetch failed", "error");
        return null;
      }
      return (res?.result ?? null) as TrackDetail | null;
    },
    enabled: !!selectedTripVehicleId,
  });

  const positions = Array.from(livePositionsRef.current.values());
  const activeCount = positions.filter((p) => p.vehicleStatus && !["COMPLETED", "CANCELLED"].includes(p.vehicleStatus)).length;
  const sosCount = positions.filter((p) => p.vehicleStatus === "SOS").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Live Tracking</h1>
          <p className="text-sm text-text-secondary mt-1">
            Fleet positions from <code className="text-xs bg-ops-bg px-1 rounded">GET /v1/tracking/live</code> + <code className="text-xs bg-ops-bg px-1 rounded">tracking.position</code> WS.
          </p>
        </div>
        <Badge variant="blue" className="flex items-center gap-1">
          <MapIcon className="w-3 h-3" /> Live API
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-ops-sidebar rounded-xl p-4">
          <p className="text-xs text-white/60">Active</p>
          <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
        </div>
        <div className="bg-ops-sidebar rounded-xl p-4">
          <p className="text-xs text-white/60">Total on map</p>
          <p className="text-2xl font-bold text-white mt-1">{positions.length}</p>
        </div>
        <div className={`${sosCount > 0 ? "bg-danger" : "bg-ops-sidebar"} rounded-xl p-4`}>
          <p className="text-xs text-white/60">SOS</p>
          <p className="text-2xl font-bold text-white mt-1">{sosCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card padding="lg" header={<h3 className="font-semibold">Fleet Map</h3>}>
            {isLoading ? (
              <div className="h-80 bg-ops-bg rounded flex items-center justify-center text-text-secondary text-sm">
                Loading positions…
              </div>
            ) : (
              <LiveMapComponent
                positions={positions}
                selectedTripVehicleId={selectedTripVehicleId}
                onSelectVehicle={setSelectedTripVehicleId}
                positionsTick={positionsTick}
              />
            )}
          </Card>

          {trackDetail && selectedTripVehicleId && (
            <Card padding="lg" header={
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Trip Track</h3>
                <button
                  onClick={() => setSelectedTripVehicleId(null)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  ✕ Close
                </button>
              </div>
            }>
              <div className="space-y-3">
                {trackDetail.etaMinutes != null && (
                  <p className="text-sm text-brand-blue font-medium flex items-center gap-1">
                    <Navigation className="w-4 h-4" /> ETA: {trackDetail.etaMinutes} min
                  </p>
                )}
                {trackDetail.milestones && trackDetail.milestones.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Milestones</p>
                    {(trackDetail.milestones as TrackMilestone[]).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${m.status === "DONE" ? "bg-green-400" : m.status === "ACTIVE" ? "bg-brand-blue" : "bg-border"}`} />
                        <span className={m.status !== "PENDING" ? "text-text-primary" : "text-text-secondary"}>{m.label}</span>
                        {m.arrivedAt && <span className="text-text-tertiary ml-auto">{new Date(m.arrivedAt).toLocaleTimeString()}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Vehicles on map</h3>
          {positions.length === 0 ? (
            <p className="text-xs text-text-secondary">No live positions.</p>
          ) : (
            positions.map((pos) => (
              <button
                key={pos.tripVehicleId}
                onClick={() => setSelectedTripVehicleId(
                  selectedTripVehicleId === pos.tripVehicleId ? null : (pos.tripVehicleId ?? null)
                )}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectedTripVehicleId === pos.tripVehicleId
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-border hover:border-brand-blue/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {pos.markerColor && (
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `#${pos.markerColor}` }}
                        />
                      )}
                      {pos.vehicleStatus && <StatusBadge status={pos.vehicleStatus as VehicleStatus} />}
                      {pos.vehicleStatus === "SOS" && <AlertCircle className="w-3 h-3 text-danger" />}
                    </div>
                    {pos.lat != null && pos.lng != null && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                      </p>
                    )}
                    {pos.speed != null && (
                      <p className="text-xs text-text-secondary">{pos.speed} km/h</p>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedTripVehicleId === pos.tripVehicleId ? "text-brand-blue" : "text-text-tertiary"}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
