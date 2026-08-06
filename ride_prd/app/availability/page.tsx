"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, csrfFetch, keys } from "@/lib/shared";
import type { components } from "@/lib/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { ArrowLeft, Car, Radio, RefreshCw, Send, User } from "lucide-react";

type Vendor = components["schemas"]["Vendor"];

interface AvailabilitySnapshot {
  city: string;
  cars: { plate: string; vehicle_type: string; vendor: string }[];
  drivers: { name: string; vendor: string }[];
}

/** The Availability page (commit 21). See the endpoint's docstring in the backend. */
export default function AvailabilityPage() {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  // City options come from the vendors' city dimension; the snapshot + remembered city come from
  // the RITMO availability endpoint (raw, not in the committed OpenAPI schema).
  const vendorsQ = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      // Pull the whole pool — the default 25/page would silently drop cities from the filter.
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {
        params: { query: { page_size: 100 } },
      });
      if (err) throw err;
      return res;
    },
  });

  const snapshotQ = useQuery({
    queryKey: ["ritmo", "availability"],
    queryFn: async (): Promise<AvailabilitySnapshot> => {
      const resp = await csrfFetch("/api/v1/ritmo/availability/", { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed to load availability (${resp.status})`);
      const body = (await resp.json()) as { result: AvailabilitySnapshot };
      return body.result;
    },
    refetchInterval: 15_000,
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const v of (vendorsQ.data?.results ?? []) as Vendor[]) {
      if (v.city) set.add(v.city);
    }
    return [...set].sort();
  }, [vendorsQ.data]);

  const snapshot = snapshotQ.data;
  const rememberedCity = snapshot?.city ?? "";

  const changeCity = async (city: string) => {
    try {
      const resp = await csrfFetch("/api/v1/ritmo/availability/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city || undefined }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body?.error?.message ?? `Failed to set city (${resp.status})`);
      }
      const body = (await resp.json()) as { result: AvailabilitySnapshot };
      qc.setQueryData(["ritmo", "availability"], body.result);
      addToast(`Availability filter set to ${city || "all cities"}.`, "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to set city", "error");
    }
  };

  const cars = snapshot?.cars ?? [];
  const drivers = snapshot?.drivers ?? [];
  const loading = snapshotQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/ritmo"
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-sm font-medium text-text-secondary hover:bg-ops-card2 hover:text-text-primary transition-colors"
            title="Back to the RITMO dispatch board"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Ritmo
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
              <Radio className="w-6 h-6 text-brand-wine" />
              Fleet Availability
            </h1>
            <p className="text-sm text-text-secondary mt-1">
            Cars not assigned to an in-progress trip and drivers currently available — across
            every vendor. The list updates the moment a vendor confirms a trip (they drop out) or
            a trip finishes (they come back), and the updated snapshot is sent to RITMO
            automatically.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void snapshotQ.refetch()}
          disabled={snapshotQ.isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${snapshotQ.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* City filter — remembered by the backend and used by the automatic RITMO pushes. */}
      <Card padding="md" className="bg-ops-bg">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">City</label>
            <select
              value={rememberedCity}
              onChange={(e) => void changeCity(e.target.value)}
              className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-text-secondary pb-2">
            <span className="inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-brand-wine" />
              RITMO is automatically sent availability for:{" "}
              <Badge variant="blue">{rememberedCity || "All cities"}</Badge>
            </span>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-10 text-center text-sm text-text-secondary">Loading availability…</div>
      ) : snapshotQ.isError ? (
        <Card padding="lg" className="bg-white text-center text-text-secondary py-10">
          <p>Could not load availability. Refresh to try again.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="md" className="bg-white">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Car className="w-4 h-4 text-brand-wine" />
              Available cars ({cars.length})
            </h4>
            {cars.length === 0 ? (
              <p className="text-xs text-text-tertiary mt-2">
                No available cars{rememberedCity ? ` in ${rememberedCity}` : ""}.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {cars.map((c) => (
                  <div
                    key={c.plate}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-white hover:bg-ops-bg/60 transition-colors"
                  >
                    <span className="font-mono text-sm font-medium text-text-primary">{c.plate}</span>
                    <span className="text-xs text-text-secondary">{c.vehicle_type}</span>
                    <span className="text-xs text-text-tertiary">{c.vendor}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md" className="bg-white">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-wine" />
              Available drivers ({drivers.length})
            </h4>
            {drivers.length === 0 ? (
              <p className="text-xs text-text-tertiary mt-2">
                No drivers currently available{rememberedCity ? ` in ${rememberedCity}` : ""}.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {drivers.map((d) => (
                  <div
                    key={`${d.name}-${d.vendor}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-white hover:bg-ops-bg/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-text-primary">
                      <PII value={d.name} type="name" />
                    </span>
                    <span className="text-xs text-text-tertiary">{d.vendor}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
