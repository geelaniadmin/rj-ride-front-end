"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TripStatus } from "@/lib/types";
import { Copy, ChevronRight } from "lucide-react";

type TripSummary = components["schemas"]["TripSummary"];

export const CloneCreation: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleWhen, setScheduleWhen] = useState("");
  const [clonedId, setClonedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: keys.trips.list({ status: undefined }),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/trips", {
        params: { query: {} },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const trips: TripSummary[] = data?.results ?? [];

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("No trip selected");
      const { data: res, error: err } = await apiClient.POST("/v1/trips/{id}/clone", {
        params: { path: { id: selectedId } },
        body: { scheduleWhen: scheduleWhen || undefined },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (trip) => {
      addToast("Trip cloned!", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      setClonedId(trip?.id ?? null);
      onDone?.();
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Clone failed", "error");
    },
  });

  if (clonedId) {
    return (
      <Card padding="lg" className="text-center py-8 space-y-3">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-text-primary">Trip cloned!</p>
        <p className="text-xs font-mono text-text-secondary">{clonedId}</p>
        <Button onClick={() => { setClonedId(null); setSelectedId(null); setScheduleWhen(""); }}>
          Clone another
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Select a trip to clone. Optionally change the schedule date/time.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-secondary text-center py-4">Loading trips…</p>
      ) : trips.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">No trips to clone.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => setSelectedId(trip.id)}
              className={`w-full text-left p-3 rounded border transition-colors ${selectedId === trip.id ? "border-brand-blue bg-brand-blue/5" : "border-border hover:border-brand-blue/40"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={trip.status as TripStatus} />
                    <span className="text-xs font-mono text-text-secondary">{trip.id.substring(0, 8)}…</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{trip.pickupAddress ?? "—"}</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${selectedId === trip.id ? "text-brand-blue" : "text-text-tertiary"}`} />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div>
          <label className="block text-xs text-text-secondary mb-1">New schedule (optional)</label>
          <Input
            type="datetime-local"
            value={scheduleWhen}
            onChange={(e) => setScheduleWhen(e.target.value)}
          />
        </div>
      )}

      <Button
        onClick={() => cloneMutation.mutate()}
        variant="primary"
        className="w-full"
        disabled={!selectedId || cloneMutation.isPending}
      >
        {cloneMutation.isPending ? "Cloning…" : "Clone Trip"}
        <Copy className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

CloneCreation.displayName = "CloneCreation";
