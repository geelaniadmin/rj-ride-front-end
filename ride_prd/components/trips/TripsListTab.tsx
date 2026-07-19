"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, formatMoney, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TripDetailView } from "@/components/trips/TripDetailView";
import { ChevronRight, ChevronLeft, X, AlertTriangle } from "lucide-react";
import type { TripStatus } from "@/lib/types";

type TripSummary = components["schemas"]["TripSummary"];
type CancelPreview = components["schemas"]["CancelPreview"];

const STATUS_FILTERS = ["", "DRAFT", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "BILLED", "CANCELLED"];

export const TripsListTab: React.FC = () => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [pageIdx, setPageIdx] = useState(0);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [cancelTripId, setCancelTripId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null);
  const [checkingCancel, setCheckingCancel] = useState(false);

  const filters = {
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    cursor: cursor ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: keys.trips.list(filters),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/trips", {
        params: { query: filters },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const trips: TripSummary[] = data?.results ?? [];
  const nextCursor = data?.next ?? null;
  const hasPrev = pageIdx > 0;
  const hasNext = !!nextCursor;

  const goNext = () => {
    if (!nextCursor) return;
    const newStack = [...cursorStack.slice(0, pageIdx + 1), nextCursor];
    setCursorStack(newStack);
    setPageIdx(pageIdx + 1);
    setCursor(nextCursor);
  };

  const goPrev = () => {
    if (pageIdx === 0) return;
    const newIdx = pageIdx - 1;
    setPageIdx(newIdx);
    setCursor(cursorStack[newIdx] ?? null);
  };

  const resetPagination = () => {
    setCursor(null);
    setCursorStack([null]);
    setPageIdx(0);
  };

  const checkCancelMutation = useMutation({
    mutationFn: async (id: string) => {
      setCheckingCancel(true);
      const { data: res, error: err } = await apiClient.POST("/v1/trips/{id}/check-cancel", {
        params: { path: { id } },
      });
      setCheckingCancel(false);
      if (err) throw err;
      return res?.result ?? null;
    },
    onSuccess: (preview) => {
      setCancelPreview(preview);
    },
    onError: (err) => {
      setCheckingCancel(false);
      addToast(err instanceof Error ? err.message : "Failed to check cancellation", "error");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: res, error: err } = await apiClient.POST("/v1/trips/{id}/cancel", {
        params: { path: { id } },
        body: { reason },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      addToast("Trip cancelled", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      setCancelTripId(null);
      setCancelPreview(null);
      setCancelReason("");
    },
    onError: (err) => {
      const msg = isApiError(err) ? err.message : "Failed to cancel trip";
      addToast(msg, "error");
    },
  });

  const openCancel = (tripId: string) => {
    setCancelTripId(tripId);
    setCancelPreview(null);
    setCancelReason("");
    void checkCancelMutation.mutateAsync(tripId);
  };

  if (selectedTripId) {
    return (
      <div>
        <button
          onClick={() => setSelectedTripId(null)}
          className="text-sm text-brand-blue hover:text-brand-blue/80 mb-4 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to list
        </button>
        <TripDetailView tripId={selectedTripId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPagination(); }}
            className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Date from</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPagination(); }} />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Date to</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPagination(); }} />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-text-secondary">Loading trips…</div>
      ) : trips.length === 0 ? (
        <Card padding="lg" className="text-center text-text-secondary py-8">
          <p>No trips found. Create your first trip request above.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {trips.map((trip) => (
            <div
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTripId(trip.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedTripId(trip.id)}
              className="p-3 rounded border border-border cursor-pointer hover:border-brand-blue/40 transition-colors bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={trip.status as TripStatus} />
                  <div>
                    <p className="text-sm font-medium text-text-primary font-mono">
                      {trip.id.substring(0, 8)}…
                      {trip.reference && (
                        <span className="ml-2 text-text-secondary font-sans">ref: {trip.reference}</span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {trip.pickupAddress ?? "—"}
                      {trip.vehicleCount != null && ` · ${trip.vehicleCount} vehicle(s)`}
                      {trip.scheduleWhen && ` · ${new Date(trip.scheduleWhen).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!["COMPLETED", "BILLED", "CANCELLED"].includes(trip.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); openCancel(trip.id); }}
                      className="text-danger hover:bg-danger/10"
                    >
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-text-tertiary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button onClick={goPrev} disabled={!hasPrev} variant="secondary" size="sm">
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <span className="text-xs text-text-secondary">Page {pageIdx + 1} · {data?.count ?? 0} total</span>
        <Button onClick={goNext} disabled={!hasNext} variant="secondary" size="sm">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {cancelTripId && (
        <Modal
          open={true}
          onClose={() => { setCancelTripId(null); setCancelPreview(null); }}
          title="Cancel Trip"
        >
          <div className="space-y-4">
            {checkingCancel && (
              <p className="text-sm text-text-secondary">Checking cancellation terms…</p>
            )}

            {cancelPreview && !checkingCancel && (
              <div className={`p-3 rounded border text-xs ${cancelPreview.free ? "bg-green-900/20 border-green-700/40 text-green-200" : "bg-danger/10 border-danger/30 text-danger"}`}>
                {cancelPreview.free ? (
                  <p>Free cancellation — no penalty.</p>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Cancellation penalty: {cancelPreview.penaltyPct}%</p>
                      {cancelPreview.penaltyMinor != null && cancelPreview.penaltyCurrency && (
                        <p>{formatMoney(cancelPreview.penaltyMinor, cancelPreview.penaltyCurrency)} will be charged.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-text-secondary mb-1">Reason (optional)</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation…"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => cancelMutation.mutate({ id: cancelTripId, reason: cancelReason })}
                variant="primary"
                className="flex-1 bg-danger hover:bg-danger/90"
                disabled={cancelMutation.isPending || checkingCancel}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Confirm Cancel"}
              </Button>
              <Button
                onClick={() => { setCancelTripId(null); setCancelPreview(null); }}
                variant="secondary"
                className="flex-1"
              >
                Keep Trip
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

TripsListTab.displayName = "TripsListTab";
