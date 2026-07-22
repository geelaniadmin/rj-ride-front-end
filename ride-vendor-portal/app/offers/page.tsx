"use client";

import React, { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, useRideEvents, isApiError, useCountdown } from "@ride/shared";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { OfferTimeline } from "@/components/offers/OfferTimeline";
import { Bell, Clock, CheckCircle, Inbox, AlertTriangle } from "lucide-react";

interface VendorOffer {
  id: string;
  trip_id: string;
  trip_vehicle_id: string;
  reference: string;
  round: number;
  status: string;
  offered_at: string;
  alerted_at: string | null;
  expires_alert_at: string;
  expires_at: string;
}

interface VendorOffersPage {
  results?: VendorOffer[];
  next?: string | null;
}

interface FleetVehicle {
  id: string;
  plate: string;
  vehicle_type_name?: string;
  is_active?: boolean;
}

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  status?: string;
  is_active?: boolean;
}

function CountdownPill({ expiresAt }: { expiresAt: string }) {
  const cd = useCountdown(expiresAt);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
        cd.expired
          ? "text-text-muted bg-page-bg"
          : cd.urgent
          ? "text-red-700 bg-red-50"
          : "text-amber-700 bg-amber-50"
      }`}
    >
      <Clock className="w-3 h-3" />
      {cd.expired ? "Expired" : cd.mmss}
    </span>
  );
}

interface AcceptModalProps {
  offer: VendorOffer;
  onClose: () => void;
}

function AcceptModal({ offer, onClose }: AcceptModalProps) {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: keys.fleet.vehicles.list({}),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/fleet/vehicles", {});
      if (error) throw error;
      return (res?.results ?? []) as FleetVehicle[];
    },
  });

  const { data: drivers = [] } = useQuery<FleetDriver[]>({
    queryKey: keys.fleet.drivers.list({}),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/fleet/drivers", {});
      if (error) throw error;
      return (res?.results ?? []) as FleetDriver[];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error } = await apiClient.POST(
        "/v1/offers/{id}/accept",
        {
          params: { path: { id: offer.id } },
          body: { vehicle_id: vehicleId, driver_id: driverId } as never,
        },
      );
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      addToast("Offer accepted — trip is now assigned!", "success");
      void qc.invalidateQueries({ queryKey: keys.offers.all() });
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      onClose();
    },
    onError: (err) => {
      if (isApiError(err) && (err as { status?: number }).status === 409) {
        addToast("This offer has already expired or been withdrawn.", "error");
      } else {
        addToast(isApiError(err) ? (err as { message: string }).message : "Accept failed", "error");
      }
    },
  });

  const availableVehicles = vehicles.filter((v) => v.is_active !== false);
  const availableDrivers = drivers.filter((d) => d.is_active !== false && d.status !== "OFFLINE");

  return (
    <Modal open onClose={onClose} title="Accept Offer — Assign Vehicle & Driver" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Assign a vehicle and driver from your fleet to accept this trip. Once accepted, the trip moves to Assigned and the offer cycle ends.
        </p>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Vehicle <span className="text-red-500">*</span>
          </label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Select vehicle…</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate}{v.vehicle_type_name ? ` — ${v.vehicle_type_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Driver <span className="text-red-500">*</span>
          </label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Select driver…</option>
            {availableDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.phone}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => acceptMutation.mutate()}
            disabled={!vehicleId || !driverId || acceptMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {acceptMutation.isPending ? "Accepting…" : "Accept Offer"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-page-bg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface OfferCardProps {
  offer: VendorOffer;
  isAlertFlashing: boolean;
}

function OfferCard({ offer, isAlertFlashing }: OfferCardProps) {
  const [showAccept, setShowAccept] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const cd = useCountdown(offer.expires_at);
  const isExpired = offer.status === "EXPIRED" || offer.status === "WITHDRAWN" || cd.expired;
  const isAlerted = offer.status === "ALERTED";

  const { data: tripData } = useQuery({
    queryKey: keys.trips.detail(offer.trip_id),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/trips/{id}", {
        params: { path: { id: offer.trip_id } },
      });
      if (error) throw error;
      return res;
    },
  });

  const tripDetail = tripData as unknown as {
    pickup_at?: string;
    stops?: Array<{ address?: string; kind?: string }>;
    vehicles?: Array<{
      id: string;
      requested_vehicle_type?: string;
      pax?: Array<{ name?: string }>;
      offers?: Array<{
        id: string; vendor_id: string; round: number; status: string;
        offered_at: string | null; alerted_at?: string | null;
        responded_at?: string | null; expired_at?: string | null;
      }>;
    }>;
  } | undefined;

  const tv = tripDetail?.vehicles?.find((v) => v.id === offer.trip_vehicle_id);
  const paxNames = tv?.pax?.map((p) => p.name).filter(Boolean).join(", ");
  const pickup = tripDetail?.stops?.find((s) => s.kind === "PICKUP");
  const vehicleType = tv?.requested_vehicle_type ?? "—";
  const ownRounds = tv?.offers ?? [];

  return (
    <>
      <div
        className={`rounded-xl border p-4 space-y-3 transition-all ${
          isExpired
            ? "bg-page-bg border-border opacity-60"
            : isAlertFlashing
            ? "bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-400 ring-offset-1 animate-pulse"
            : isAlerted
            ? "bg-amber-50 border-amber-200"
            : "bg-card-bg border-card-border"
        }`}
      >
        {isAlertFlashing && !isExpired && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-100 border border-amber-300 rounded-lg">
            <Bell className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              Agency is waiting for your response
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-text-primary">{offer.reference}</span>
              <span className="text-xs text-text-muted">Round {offer.round}</span>
            </div>
            {tripDetail?.pickup_at && (
              <p className="text-xs text-text-muted">
                Pickup:{" "}
                {new Date(tripDetail.pickup_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            {pickup?.address && (
              <p className="text-xs text-text-muted truncate">{pickup.address}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
              <span>{vehicleType}</span>
              {paxNames && <span>· {paxNames}</span>}
            </div>
          </div>
          <div className="flex-shrink-0">
            {!isExpired && <CountdownPill expiresAt={offer.expires_at} />}
            {isExpired && (
              <span className="text-xs text-text-muted bg-page-bg border border-border rounded-full px-2 py-0.5">
                {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {!isExpired && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAccept(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => setShowTimeline((p) => !p)}
              className="px-3 py-2 text-xs text-text-muted border border-border rounded-lg hover:bg-page-bg transition-colors"
            >
              {showTimeline ? "Hide" : "History"}
            </button>
          </div>
        )}

        {isExpired && (
          <p className="text-xs text-text-muted italic">
            This offer has lapsed. A new offer from the agency will appear here if they reallocate.
          </p>
        )}

        {showTimeline && ownRounds.length > 0 && (
          <div className="pt-2 border-t border-border">
            <OfferTimeline
              rounds={ownRounds.map((o) => ({
                id: o.id,
                vendor_id: o.vendor_id,
                round: o.round,
                status: o.status,
                offered_at: o.offered_at,
                alerted_at: o.alerted_at,
                responded_at: o.responded_at,
                expired_at: o.expired_at,
              }))}
            />
          </div>
        )}
      </div>

      {showAccept && <AcceptModal offer={offer} onClose={() => setShowAccept(false)} />}
    </>
  );
}

export default function OffersInboxPage() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const alertSoundRef = useRef<AudioContext | null>(null);
  const [flashingOfferIds, setFlashingOfferIds] = useState<Set<string>>(new Set());
  const playedAlertRef = useRef<Set<string>>(new Set());

  const playAlertSound = useCallback(() => {
    try {
      if (!alertSoundRef.current) {
        alertSoundRef.current = new AudioContext();
      }
      const ctx = alertSoundRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
    }
  }, []);

  useRideEvents({
    invalidationMap: {
      "trip.offer_made": keys.offers.all(),
      "trip.offer_alerted": keys.offers.all(),
      "trip.offer_expired": keys.offers.all(),
      "trip.offer_withdrawn": keys.offers.all(),
    },
    handler: (event) => {
      if (event.type === "trip.offer_alerted") {
        const offerId = (event as { payload?: { offer_id?: string } }).payload?.offer_id;
        if (offerId && !playedAlertRef.current.has(offerId)) {
          playedAlertRef.current.add(offerId);
          playAlertSound();
          addToast("Agency is waiting — respond before the offer expires!", "info");
          setFlashingOfferIds((prev) => new Set([...prev, offerId]));
          setTimeout(() => {
            setFlashingOfferIds((prev) => {
              const next = new Set(prev);
              next.delete(offerId);
              return next;
            });
          }, 10_000);
        }
        void qc.invalidateQueries({ queryKey: keys.offers.all() });
      }
      if (event.type === "trip.offer_expired") {
        void qc.invalidateQueries({ queryKey: keys.offers.all() });
      }
    },
  });

  const { data, isLoading, isError } = useQuery<VendorOffersPage>({
    queryKey: keys.offers.list({}),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/vendor/offers" as never, {} as never);
      if (error) throw error;
      return res as unknown as VendorOffersPage;
    },
    refetchInterval: 60_000,
  });

  const offers = data?.results ?? [];
  const activeOffers = offers.filter((o) => o.status === "OFFERED" || o.status === "ALERTED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-blue" />
            Offers Inbox
            {activeOffers.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-blue text-white text-xs font-bold">
                {activeOffers.length}
              </span>
            )}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Trip offers awaiting your response. Accepting assigns a vehicle and driver.
          </p>
        </div>
      </div>

      {activeOffers.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You have {activeOffers.length} active offer{activeOffers.length > 1 ? "s" : ""}. Offers lapse automatically — accept before the countdown expires. No decline button needed; the offer will be reallocated by the agency.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-sm text-text-muted">Loading offers…</div>
      ) : isError ? (
        <div className="text-center py-12 text-sm text-red-600">Failed to load offers.</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Inbox className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <p className="text-sm text-text-muted">No offers right now.</p>
          <p className="text-xs text-text-muted">New trip offers from the agency will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isAlertFlashing={flashingOfferIds.has(offer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
