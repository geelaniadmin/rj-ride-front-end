"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, csrfFetch, isApiError } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BellRing, Car, Inbox, MapPin, RefreshCw, Search, Send, User } from "lucide-react";
import type { TripStatus } from "@/lib/types";

// The RITMO endpoints are not in the committed OpenAPI schema, so we type them locally and
// drive them with csrfFetch (raw) instead of the typed apiClient.
interface ActiveOffer {
  id: string;
  vendor_id: string;
  vendor_name: string | null;
  status: "OFFERED" | "ALERTED";
  round: number;
  offered_at: string;
  expires_alert_at: string;
  expires_at: string;
}

interface RitmoVehicle {
  id: string;
  vehicle_type_name: string;
  status: string;
  vendor_id: string | null;
  vendor_name: string | null;
  pax_count: number;
  pax: { name: string; phone: string }[];
  allottable: boolean;
  active_offer: ActiveOffer | null;
}

interface RitmoTrip {
  id: string;
  reference: string;
  ritmo_ref: string;
  status: string;
  pickup_at: string | null;
  created_at: string;
  customer_name: string | null;
  stops: { kind: string; address: string }[];
  vehicles: RitmoVehicle[];
}

interface Vendor {
  id: string;
  name: string;
}

function genIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function countdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RitmoPage() {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<Record<string, string>>({});
  const [allotting, setAllotting] = useState<string | null>(null);
  const [alerting, setAlerting] = useState<string | null>(null);
  const [alertingAll, setAlertingAll] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [search, setSearch] = useState("");
  // A 1s ticker so the offer countdowns tick down live between refetches.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: trips = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ritmo", "requests"],
    queryFn: async (): Promise<RitmoTrip[]> => {
      const resp = await csrfFetch("/api/v1/ritmo/requests/", { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed to load RITMO requests (${resp.status})`);
      const body = (await resp.json()) as { results?: RitmoTrip[] };
      return body.results ?? [];
    },
    refetchInterval: 20_000,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["fleet", "vendors", "all"],
    queryFn: async (): Promise<Vendor[]> => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vendors", {});
      if (err) throw err;
      return ((res as unknown as { results?: Vendor[] })?.results ?? []) as Vendor[];
    },
    staleTime: 60_000,
  });

  // Offers still awaiting a vendor response — exactly what "Alert vendors" will nudge.
  const pendingAlertCount = useMemo(
    () =>
      trips.reduce(
        (n, trip) =>
          n + trip.vehicles.filter((v) => v.active_offer?.status === "OFFERED").length,
        0,
      ),
    [trips],
  );

  const vendorOptions = useMemo(
    () => vendors.map((v) => ({ value: v.id, label: v.name })),
    [vendors],
  );

  const visibleTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((t) =>
      [
        t.reference,
        t.ritmo_ref,
        t.customer_name,
        t.status,
        ...t.stops.map((s) => s.address),
        ...t.vehicles.map((v) => v.vehicle_type_name),
        ...t.vehicles.flatMap((v) => v.pax.map((p) => `${p.name} ${p.phone}`)),
        ...t.vehicles.map((v) => v.active_offer?.vendor_name ?? ""),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [trips, search]);

  const allot = async (vehicleId: string) => {
    const vendorId = selectedVendor[vehicleId];
    if (!vendorId) {
      addToast("Pick a vendor first.", "error");
      return;
    }
    setAllotting(vehicleId);
    try {
      const resp = await csrfFetch(`/api/v1/trips/vehicles/${vehicleId}/offer/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": genIdempotencyKey() },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `Allot failed (${resp.status})`);
      }
      addToast("Offer sent to vendor — awaiting acceptance.", "success");
      setSelectedVendor((prev) => ({ ...prev, [vehicleId]: "" }));
      void qc.invalidateQueries({ queryKey: ["ritmo", "requests"] });
    } catch (err) {
      addToast(
        isApiError(err) ? err.message : err instanceof Error ? err.message : "Failed to allot",
        "error",
      );
    } finally {
      setAllotting(null);
    }
  };

  const alertVendor = async (offerId: string, vendorName: string | null) => {
    setAlerting(offerId);
    try {
      const resp = await csrfFetch(`/api/v1/offers/${offerId}/alert/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `Alert failed (${resp.status})`);
      }
      const body = (await resp.json().catch(() => ({}))) as { result?: { outcome?: string } };
      if (body.result?.outcome === "noop") {
        addToast("This offer was already alerted or is no longer active.", "info");
      } else {
        addToast(`Alert sent to ${vendorName ?? "the vendor"}.`, "success");
      }
      void qc.invalidateQueries({ queryKey: ["ritmo", "requests"] });
    } catch (err) {
      addToast(
        isApiError(err) ? err.message : err instanceof Error ? err.message : "Failed to alert",
        "error",
      );
    } finally {
      setAlerting(null);
    }
  };

  const alertAllVendors = async () => {
    setAlertingAll(true);
    try {
      const resp = await csrfFetch("/api/v1/ritmo/alert-all/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `Alert failed (${resp.status})`);
      }
      const body = (await resp.json().catch(() => ({}))) as { result?: { alerted?: number } };
      const n = body.result?.alerted ?? 0;
      addToast(
        n === 0
          ? "No vendors to alert — every offer is already alerted or answered."
          : `Alert sent to ${n} vendor(s).`,
        n === 0 ? "info" : "success",
      );
      void qc.invalidateQueries({ queryKey: ["ritmo", "requests"] });
    } catch (err) {
      addToast(
        isApiError(err) ? err.message : err instanceof Error ? err.message : "Failed to alert",
        "error",
      );
    } finally {
      setAlertingAll(false);
    }
  };

  const sendAllToRitmo = async () => {
    setSendingAll(true);
    try {
      const resp = await csrfFetch("/api/v1/ritmo/push-all/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `Send to RITMO failed (${resp.status})`);
      }
      const body = (await resp.json().catch(() => ({}))) as { result?: { pushed?: number } };
      const n = body.result?.pushed ?? 0;
      addToast(`Current status of ${n} RITMO request(s) sent back to RITMO.`, "success");
    } catch (err) {
      addToast(
        isApiError(err) ? err.message : err instanceof Error ? err.message : "Failed to send to RITMO",
        "error",
      );
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Inbox className="w-6 h-6" /> RITMO Requests
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Bookings received from RITMO. Allot each vehicle to a vendor — the vendor has ~5 minutes
            to accept in their portal, else the offer expires and you can re-allot.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void alertAllVendors()}
            disabled={alertingAll || pendingAlertCount === 0}
            title={
              pendingAlertCount === 0
                ? "No un-answered offers to alert"
                : `Nudge all ${pendingAlertCount} vendor(s) sitting on an un-answered offer`
            }
          >
            <BellRing className="w-4 h-4 mr-1" />
            {alertingAll
              ? "Alerting…"
              : `Alert vendors${pendingAlertCount ? ` (${pendingAlertCount})` : ""}`}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void sendAllToRitmo()}
            disabled={sendingAll || trips.length === 0}
            title="Push the current status of every RITMO request back to RITMO"
          >
            <Send className="w-4 h-4 mr-1" />
            {sendingAll ? "Sending…" : "Send to RITMO"}
          </Button>
        </div>
      </div>

      {trips.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests — reference, RITMO ref, passenger, car type, vendor, pickup or drop…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-text-secondary">Loading RITMO requests…</div>
      ) : trips.length === 0 ? (
        <Card padding="lg" className="text-center text-text-secondary py-10">
          <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No RITMO requests yet. Bookings pushed from RITMO will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleTrips.length === 0 ? (
            <Card padding="lg" className="text-center text-text-secondary py-8">
              <p>No requests match “{search}”.</p>
            </Card>
          ) : null}
          {visibleTrips.map((trip) => (
            <Card key={trip.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={trip.status as TripStatus} />
                    <span className="font-mono text-sm text-text-primary">{trip.reference}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue font-medium">
                      RITMO: {trip.ritmo_ref}
                    </span>
                    {trip.customer_name && (
                      <span className="text-sm text-text-secondary">{trip.customer_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {trip.pickup_at ? new Date(trip.pickup_at).toLocaleString() : "—"}
                  </p>
                  {trip.stops.length > 0 && (
                    <div className="mt-1.5 flex items-start gap-1 text-xs text-text-secondary">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{trip.stops.map((s) => s.address).join("  →  ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {trip.vehicles.map((v) => (
                  <div key={v.id} className="p-2.5 rounded border border-border bg-white">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-sm">
                        <StatusBadge status={v.status as TripStatus} />
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold"
                          title="Car type requested by RITMO"
                        >
                          <Car className="w-3.5 h-3.5" />
                          {v.vehicle_type_name}
                        </span>
                        {v.pax.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-text-secondary">
                            <User className="w-3.5 h-3.5 text-text-tertiary" />
                            {v.pax[0]!.name}
                            {v.pax[0]!.phone && (
                              <span className="text-text-tertiary">· {v.pax[0]!.phone}</span>
                            )}
                          </span>
                        )}
                        {v.pax_count > 1 && (
                          <span className="text-xs text-text-tertiary">{v.pax_count} pax</span>
                        )}
                      </div>

                      {v.active_offer ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Send className="w-3.5 h-3.5 text-brand-blue" />
                          <span className="text-text-primary">
                            Offered to <strong>{v.active_offer.vendor_name}</strong>
                          </span>
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              v.active_offer.status === "ALERTED"
                                ? "bg-warning/15 text-warning"
                                : "bg-brand-blue/10 text-brand-blue"
                            }`}
                          >
                            {v.active_offer.status} · {countdown(v.active_offer.expires_at, now)}
                          </span>
                          {v.active_offer.status === "OFFERED" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={alerting === v.active_offer.id}
                              onClick={() =>
                                void alertVendor(
                                  v.active_offer!.id,
                                  v.active_offer!.vendor_name,
                                )
                              }
                              title="Nudge the vendor now instead of waiting for the timer"
                            >
                              <BellRing className="w-3.5 h-3.5 mr-1" />
                              {alerting === v.active_offer.id ? "Alerting…" : "Alert"}
                            </Button>
                          )}
                        </div>
                      ) : v.allottable ? (
                        <div className="flex items-center gap-2">
                          <div className="w-56">
                            <SearchableSelect
                              options={vendorOptions}
                              value={selectedVendor[v.id] ?? ""}
                              placeholder="Search vendor…"
                              onChange={(val) =>
                                setSelectedVendor((prev) => ({ ...prev, [v.id]: val }))
                              }
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={allotting === v.id || !selectedVendor[v.id]}
                            onClick={() => void allot(v.id)}
                          >
                            {allotting === v.id ? "Allotting…" : "Allot"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary">
                          {v.vendor_name ? `Assigned · ${v.vendor_name}` : v.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
