"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, useRideEvents, wsInvalidationMap, isApiError } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Badge } from "@/components/ui/Badge";
import { SuggestedVendorsModal } from "@/components/offers/SuggestedVendorsModal";
import { ActiveOfferRow } from "@/components/offers/ActiveOfferRow";
import { OfferTimeline } from "@/components/offers/OfferTimeline";
import { Inbox, ChevronDown, ChevronRight } from "lucide-react";
import type { ActiveOffer } from "@/components/offers/ActiveOfferRow";

interface IncomingOfferRound {
  id: string;
  vendor_id: string;
  round: number;
  status: string;
  offered_at: string | null;
}

interface IncomingVehicle {
  id: string;
  status: string;
  requested_vehicle_type: string;
  pax_count: number;
  offers: IncomingOfferRound[];
}

interface IncomingTrip {
  id: string;
  reference: string;
  pickup_at: string;
  created_via: string;
  customer_name: string;
  vehicles: IncomingVehicle[];
}

interface IncomingPage {
  results?: IncomingTrip[];
  next?: string | null;
}

function sourceBadge(via: string) {
  if (via === "API_PAX") return <Badge variant="purple">API_PAX</Badge>;
  if (via === "API_VEHICLE_COUNT") return <Badge variant="teal">API_V</Badge>;
  return <Badge variant="default">{via}</Badge>;
}

interface TripRowProps {
  trip: IncomingTrip;
}

const TripRow: React.FC<TripRowProps> = ({ trip }) => {
  const [expanded, setExpanded] = useState(false);
  const [allocateModal, setAllocateModal] = useState<{ vehicleId: string; currentRound: number } | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const pendingVehicles = trip.vehicles.filter((v) => v.status === "PENDING");

  const { data: offersData } = useQuery({
    queryKey: ["trip-offers", trip.id],
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/trips/{id}/offers" as never, {
        params: { path: { id: trip.id } },
      } as never);
      if (error) throw error;
      return (res as unknown as { result?: unknown[] })?.result ?? [];
    },
    enabled: expanded,
  });

  const paxNames = trip.vehicles
    .flatMap((v) => {
      const tv = v as unknown as { pax?: Array<{ name?: string }> };
      return tv.pax ?? [];
    })
    .map((p) => p.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const vehicleTypes = [...new Set(trip.vehicles.map((v) => v.requested_vehicle_type))].join(", ");

  const allOffers = (offersData as unknown as ActiveOffer[] | undefined) ?? [];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left p-4 hover:bg-ops-bg/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-text-primary">{trip.reference}</span>
              {sourceBadge(trip.created_via)}
              <span className="text-xs text-text-secondary">{trip.customer_name}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-text-secondary">
              <span>
                {new Date(trip.pickup_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {vehicleTypes && <span>· {vehicleTypes}</span>}
              {paxNames && <span>· {paxNames}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-secondary">
              {pendingVehicles.length} pending
            </span>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {pendingVehicles.map((v) => {
            const vehicleOffers = allOffers.filter(
              (o) => (o as unknown as { trip_vehicle_id?: string }).trip_vehicle_id === v.id,
            );
            const activeOffer = vehicleOffers.find(
              (o) => o.status === "OFFERED" || o.status === "ALERTED",
            );
            const expiredRounds = vehicleOffers.filter(
              (o) => o.status === "EXPIRED" || o.status === "WITHDRAWN",
            );
            const nextRound = (vehicleOffers.length ? Math.max(...vehicleOffers.map((o) => o.round)) : 0) + 1;

            return (
              <div key={v.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{v.requested_vehicle_type}</span>
                    {v.pax_count > 0 && (
                      <span className="text-xs text-text-secondary">{v.pax_count} pax</span>
                    )}
                  </div>
                  {!activeOffer && (
                    <button
                      onClick={() => setAllocateModal({ vehicleId: v.id, currentRound: nextRound })}
                      className="px-3 py-1.5 text-xs bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors font-medium"
                    >
                      Select Vendor
                    </button>
                  )}
                </div>

                {activeOffer && (
                  <ActiveOfferRow
                    offer={activeOffer}
                    tripVehicleId={v.id}
                    onReAllocate={() => setAllocateModal({ vehicleId: v.id, currentRound: nextRound })}
                  />
                )}

                {vehicleOffers.length > 0 && (
                  <div>
                    <p className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2">
                      Offer History
                    </p>
                    <OfferTimeline
                      rounds={vehicleOffers.map((o) => ({
                        id: o.id,
                        vendor_id: o.vendor_id,
                        vendor_name: o.vendor_name,
                        round: o.round,
                        status: o.status,
                        offered_at: o.offered_at,
                        alerted_at: o.alerted_at,
                        responded_at: (o as unknown as { responded_at?: string | null }).responded_at,
                        expired_at: (o as unknown as { expired_at?: string | null }).expired_at,
                      }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allocateModal && (
        <SuggestedVendorsModal
          open={!!allocateModal}
          onClose={() => setAllocateModal(null)}
          tripVehicleId={allocateModal.vehicleId}
          tripId={trip.id}
          currentRound={allocateModal.currentRound}
        />
      )}
    </div>
  );
};

export default function IncomingQueuePage() {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  useRideEvents({
    invalidationMap: {
      ...wsInvalidationMap,
      "trip.created": keys.dispatch.incoming.list(),
      "trip.offer_made": keys.dispatch.incoming.list(),
      "trip.offer_alerted": keys.dispatch.incoming.list(),
      "trip.offer_expired": keys.dispatch.incoming.list(),
      "trip.offer_withdrawn": keys.dispatch.incoming.list(),
    },
    handler: (event) => {
      if (event.type === "trip.offer_expired") {
        addToast(`Offer expired — trip ${(event as { tripId?: string }).tripId?.slice(0, 8) ?? ""}`, "info");
        void qc.invalidateQueries({ queryKey: keys.dispatch.incoming.list() });
      }
    },
  });

  const { data, isLoading, isError } = useQuery<IncomingPage>({
    queryKey: keys.dispatch.incoming.list(),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/dispatch/incoming" as never, {} as never);
      if (error) throw error;
      return res as unknown as IncomingPage;
    },
    refetchInterval: 60_000,
  });

  const trips = data?.results ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Inbox className="w-6 h-6 text-brand-blue" />
          Incoming Request Queue
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          API-originated trips awaiting vendor allocation. WS events auto-refresh.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-text-secondary">Loading incoming queue…</div>
      ) : isError ? (
        <div className="text-center py-12 text-sm text-danger">Failed to load incoming queue.</div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Inbox className="w-10 h-10 text-text-secondary mx-auto opacity-40" />
          <p className="text-sm text-text-secondary">No pending API requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
