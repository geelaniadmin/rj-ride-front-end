"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError, useLanguageStore, t, formatMoney } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useVendorTrips, useVendorTripDetail } from "@/hooks/useVendorTrips";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { TripMapViewWrapper } from "@/components/trips/TripMapViewWrapper";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, X, CheckCircle, RefreshCw, Key } from "lucide-react";

type TripSummary = components["schemas"]["TripSummary"];
type Vehicle = components["schemas"]["Vehicle"];
type Driver = components["schemas"]["Driver"];

const ACTIVE_STATUSES = new Set([
  "ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP",
  "PAX_PICKED", "IN_TRANSIT", "AT_DROP", "PAX_DROPPED",
]);

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

const OTP_PHASES: Record<string, "pickup" | "drop"> = {
  PAX_PICKED: "pickup",
  PAX_DROPPED: "drop",
};

const TRANSITION_TARGETS: Record<string, string[]> = {
  ASSIGNED: ["DRIVER_ACCEPTED", "EN_ROUTE_PICKUP"],
  DRIVER_ACCEPTED: ["EN_ROUTE_PICKUP"],
  EN_ROUTE_PICKUP: ["AT_PICKUP"],
  AT_PICKUP: ["PAX_PICKED"],
  PAX_PICKED: ["IN_TRANSIT"],
  IN_TRANSIT: ["AT_DROP"],
  AT_DROP: ["PAX_DROPPED"],
  PAX_DROPPED: ["COMPLETED"],
};

export default function TripsPage() {
  const language = useLanguageStore((s) => s.language);
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data: trips = [], isLoading } = useVendorTrips();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState<{ tripId: string; vehicleId: string } | null>(null);
  const [otpModal, setOtpModal] = useState<{ tripId: string; vehicleId: string; phase: "pickup" | "drop"; targetStatus: string } | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [reassignVehicleId, setReassignVehicleId] = useState("");
  const [reassignDriverId, setReassignDriverId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: tripDetail } = useVendorTripDetail(selectedTripId);

  const { data: fleetVehicles = [] } = useQuery({
    queryKey: keys.fleet.vehicles.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles", {});
      if (err) throw err;
      return (res?.result ?? []) as Vehicle[];
    },
  });

  const { data: fleetDrivers = [] } = useQuery({
    queryKey: keys.fleet.drivers.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/drivers", {});
      if (err) throw err;
      return (res?.result ?? []) as Driver[];
    },
  });

  const statusOptions = useMemo(() => {
    const set = new Set(trips.map((t) => t.status));
    return ["All", ...Array.from(set)];
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (statusFilter !== "All" && trip.status !== statusFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchId = trip.id.toLowerCase().includes(q);
        const matchRef = trip.reference?.toLowerCase().includes(q) ?? false;
        const matchAddr = trip.pickupAddress?.toLowerCase().includes(q) ?? false;
        if (!matchId && !matchRef && !matchAddr) return false;
      }
      return true;
    });
  }, [trips, statusFilter, debouncedSearch]);

  const transitionMutation = useMutation({
    mutationFn: async ({ tripId, vehicleId, targetStatus }: { tripId: string; vehicleId: string; targetStatus: string }) => {
      const { data: res, error: err } = await apiClient.POST(
        "/v1/trips/{id}/vehicles/{vehicleId}/transitions",
        { params: { path: { id: tripId, vehicleId } }, body: { targetStatus } }
      );
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (_, vars) => {
      addToast(`Status updated → ${vars.targetStatus.replace(/_/g, " ")}`, "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
    },
    onError: (err, vars) => {
      if (isApiError(err) && err.status === 409) {
        addToast(`Transition to ${vars.targetStatus} not allowed: ${(err as { message: string }).message}`, "error");
      } else {
        addToast(isApiError(err) ? (err as { message: string }).message : "Transition failed", "error");
      }
    },
  });

  const otpMutation = useMutation({
    mutationFn: async ({ tripId, vehicleId, phase, otp }: { tripId: string; vehicleId: string; phase: "pickup" | "drop"; otp: string }) => {
      const { data: res, error: err } = await apiClient.POST(
        "/v1/trips/{id}/vehicles/{vehicleId}/verify-otp",
        { params: { path: { id: tripId, vehicleId } }, body: { phase, otp } }
      );
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (_, vars) => {
      addToast(`OTP verified — ${vars.phase}`, "success");
      setOtpModal(null);
      setOtpValue("");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
    },
    onError: (err) => {
      addToast(isApiError(err) ? (err as { message: string }).message : "OTP verification failed", "error");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ tripId, vehicleId, fleetVehicleId, driverId }: {
      tripId: string; vehicleId: string; fleetVehicleId: string; driverId: string;
    }) => {
      const { data: res, error: err } = await apiClient.POST(
        "/v1/trips/{id}/vehicles/{vehicleId}/assign",
        {
          params: { path: { id: tripId, vehicleId } },
          body: { fleetVehicleId, driverId },
        }
      );
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      addToast("Vehicle and driver reassigned", "success");
      setShowReassignModal(null);
      setReassignVehicleId("");
      setReassignDriverId("");
      setReassignReason("");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
    },
    onError: (err) => {
      addToast(isApiError(err) ? (err as { message: string }).message : "Reassignment failed", "error");
    },
  });

  const handleTransition = useCallback((tripId: string, vehicleId: string, targetStatus: string) => {
    if (OTP_PHASES[targetStatus]) {
      setOtpModal({ tripId, vehicleId, phase: OTP_PHASES[targetStatus]!, targetStatus });
    } else {
      transitionMutation.mutate({ tripId, vehicleId, targetStatus });
    }
  }, [transitionMutation]);

  const handleOtpSubmit = () => {
    if (!otpModal || !otpValue.trim()) return;
    otpMutation.mutate({ ...otpModal, otp: otpValue });
  };

  const columns: Column<TripSummary>[] = [
    {
      key: "id", header: t("tripId", language),
      render: (trip) => <span className="font-mono text-xs">{trip.id.substring(0, 8)}…</span>,
      sortable: true,
    },
    {
      key: "status", header: t("status", language),
      render: (trip) => <StatusBadge status={trip.status} />,
      sortable: true,
    },
    {
      key: "route", header: t("route", language),
      render: (trip) => (
        <span className="text-xs text-text-muted truncate max-w-[200px] inline-block">
          {trip.pickupAddress ?? "—"}
        </span>
      ),
    },
    {
      key: "vehicles", header: "Vehicles",
      render: (trip) => <span className="text-sm">{trip.vehicleCount ?? 1}</span>,
    },
    {
      key: "scheduled", header: t("scheduled", language),
      render: (trip) => trip.scheduleWhen ? (
        <span className="text-xs">{new Date(trip.scheduleWhen).toLocaleString()}</span>
      ) : <span className="text-text-muted">—</span>,
      sortable: true,
    },
    {
      key: "ref", header: "Ref",
      render: (trip) => trip.reference ? (
        <span className="text-xs text-text-muted">{trip.reference}</span>
      ) : <span className="text-text-muted">—</span>,
    },
    {
      key: "actions", header: t("actions", language),
      render: (trip) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTripId(trip.id); setShowDetailDrawer(true); }}
          className="px-2.5 py-1 text-xs text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors font-medium"
        >
          {t("view", language)}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{t("trips", language)}</h2>
        <p className="text-sm text-text-muted mt-1">
          {trips.length} {t("tripsAssignedToFleet", language)}
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchTripIdOrRoute", language)}
              className="w-full pl-9 pr-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "All" ? t("allStatuses", language) : opt.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {(searchQuery || statusFilter !== "All") && (
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" /> {t("clear", language)}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Loading trips…</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTrips}
          pageSize={15}
          emptyMessage={t("noTripsMatch", language)}
          onRowClick={(trip) => { setSelectedTripId(trip.id); setShowDetailDrawer(true); }}
        />
      )}

      {/* TRIP DETAIL DRAWER */}
      <Drawer open={showDetailDrawer} onClose={() => { setShowDetailDrawer(false); setSelectedTripId(null); }} title={t("tripDetails", language)} width="max-w-2xl">
        {selectedTripId && tripDetail && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-text-muted">{tripDetail.id}</span>
              <StatusBadge status={tripDetail.status} size="md" />
            </div>

            {tripDetail.reference && (
              <p className="text-xs text-text-muted">Ref: {tripDetail.reference}</p>
            )}

            {tripDetail.stops.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("route", language)}</h4>
                <div className="space-y-3">
                  {tripDetail.stops.map((stop, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 ${idx === 0 ? "bg-success" : idx === tripDetail.stops.length - 1 ? "bg-danger" : "bg-warning"}`} />
                        {idx < tripDetail.stops.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                      </div>
                      <div>
                        <p className="text-sm text-text-primary font-medium">{stop.address}</p>
                        <p className="text-xs text-text-muted">
                          {stop.locationType} · {stop.type}
                          {stop.plannedTime && ` · ${new Date(stop.plannedTime).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <TripMapViewWrapper stops={tripDetail.stops.map((s) => ({
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    type: s.type as "PICKUP" | "DROP" | "WAYPOINT",
                    locationType: s.locationType as "AIRPORT" | "RAIL" | "HOTEL" | "CITY" | "ADDRESS",
                    plannedTime: s.plannedTime,
                  }))} />
                </div>
              </div>
            )}

            {tripDetail.vehicles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Vehicles</h4>
                <div className="space-y-3">
                  {tripDetail.vehicles.map((tv, idx) => {
                    const currentStatus = tv.status;
                    const availableTargets = TRANSITION_TARGETS[currentStatus] ?? [];
                    const canReassign = ACTIVE_STATUSES.has(currentStatus);
                    const isTerminal = TERMINAL_STATUSES.has(currentStatus);

                    return (
                      <div key={tv.id} className="p-4 bg-ops-bg rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-mono">Vehicle {idx + 1}</span>
                            <StatusBadge status={tv.status} />
                          </div>
                          {!isTerminal && canReassign && (
                            <button
                              onClick={() => {
                                setReassignVehicleId(tv.vehicleId ?? "");
                                setReassignDriverId(tv.driverId ?? "");
                                setShowReassignModal({ tripId: tripDetail.id, vehicleId: tv.id });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                            >
                              <RefreshCw className="w-3 h-3" /> Reassign
                            </button>
                          )}
                        </div>

                        {tv.vehicleId && (
                          <p className="text-xs text-text-muted">
                            Fleet Vehicle: <span className="font-mono text-text-primary">{tv.vehicleId}</span>
                          </p>
                        )}
                        {tv.driverId && (
                          <p className="text-xs text-text-muted">
                            Driver: <span className="font-mono text-text-primary">{tv.driverId}</span>
                          </p>
                        )}
                        {tv.lockedPriceMinor != null && tv.lockedPriceCurrency && (
                          <p className="text-sm font-semibold text-text-primary">
                            {formatMoney(tv.lockedPriceMinor, tv.lockedPriceCurrency)}
                          </p>
                        )}

                        {!isTerminal && availableTargets.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {availableTargets.map((target) => {
                              const needsOtp = !!OTP_PHASES[target];
                              return (
                                <button
                                  key={target}
                                  onClick={() => handleTransition(tripDetail.id, tv.id, target)}
                                  disabled={transitionMutation.isPending}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                    target === "DRIVER_ACCEPTED"
                                      ? "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                                      : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/20"
                                  }`}
                                >
                                  {needsOtp && <Key className="w-3 h-3" />}
                                  {target === "DRIVER_ACCEPTED" ? <CheckCircle className="w-3 h-3" /> : null}
                                  {target.replace(/_/g, " ")}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {selectedTripId && !tripDetail && (
          <div className="text-center py-8 text-text-muted text-sm">Loading trip details…</div>
        )}
      </Drawer>

      {/* REASSIGN MODAL */}
      {showReassignModal && (
        <Modal
          open={!!showReassignModal}
          onClose={() => { setShowReassignModal(null); setReassignVehicleId(""); setReassignDriverId(""); setReassignReason(""); }}
          title="Reassign Vehicle & Driver"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Select a replacement vehicle and driver from your fleet. The current assignment will be replaced.
            </p>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Vehicle <span className="text-danger">*</span></label>
              <select
                value={reassignVehicleId}
                onChange={(e) => setReassignVehicleId(e.target.value)}
                className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">Select vehicle…</option>
                {fleetVehicles.filter((v) => v.active !== false).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Driver <span className="text-danger">*</span></label>
              <select
                value={reassignDriverId}
                onChange={(e) => setReassignDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">Select driver…</option>
                {fleetDrivers.filter((d) => d.available !== false && d.active !== false).map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.phone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Reason</label>
              <input
                type="text"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="e.g. Vehicle breakdown, driver unavailable…"
                className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  if (!showReassignModal || !reassignVehicleId || !reassignDriverId) return;
                  assignMutation.mutate({
                    tripId: showReassignModal.tripId,
                    vehicleId: showReassignModal.vehicleId,
                    fleetVehicleId: reassignVehicleId,
                    driverId: reassignDriverId,
                  });
                }}
                disabled={!reassignVehicleId || !reassignDriverId || assignMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-brand-blue text-white rounded-lg font-medium text-sm hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assignMutation.isPending ? "Reassigning…" : "Confirm Reassign"}
              </button>
              <button
                onClick={() => { setShowReassignModal(null); setReassignVehicleId(""); setReassignDriverId(""); setReassignReason(""); }}
                className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* OTP MODAL */}
      {otpModal && (
        <Modal
          open={!!otpModal}
          onClose={() => { setOtpModal(null); setOtpValue(""); }}
          title={`OTP Verification — ${otpModal.phase.charAt(0).toUpperCase() + otpModal.phase.slice(1)}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-brand-blue/5 rounded-lg">
              <Key className="w-4 h-4 text-brand-blue" />
              <p className="text-sm text-text-primary">Enter the OTP provided by the passenger to confirm {otpModal.phase}.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">OTP Code</label>
              <input
                type="text"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="Enter OTP…"
                maxLength={6}
                className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-center text-lg"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleOtpSubmit}
                disabled={!otpValue.trim() || otpMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {otpMutation.isPending ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                onClick={() => { setOtpModal(null); setOtpValue(""); }}
                className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
