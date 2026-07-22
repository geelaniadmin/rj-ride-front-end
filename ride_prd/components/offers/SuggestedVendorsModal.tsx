"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { MapPin, AlertCircle, ChevronRight } from "lucide-react";

interface ExpiredRound {
  round: number;
  vendor_id: string;
}

interface SuggestedVendor {
  vendor_id: string;
  vendor_name: string;
  nearest_vehicle_distance_km?: number | null;
  expired_rounds: ExpiredRound[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  tripVehicleId: string;
  tripId: string;
  currentRound: number;
}

export const SuggestedVendorsModal: React.FC<Props> = ({
  open,
  onClose,
  tripVehicleId,
  tripId,
  currentRound,
}) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: nearestData, isLoading } = useQuery({
    queryKey: ["fleet", "nearest", tripVehicleId],
    queryFn: async () => {
      const trip = await apiClient.GET("/v1/trips/{id}", {
        params: { path: { id: tripId } },
      });
      const tripData = trip.data as unknown as {
        vehicles?: Array<{
          id: string;
          requested_vehicle_type?: string;
        }>;
        stops?: Array<{ lat?: string | null; lng?: string | null }>;
      } | undefined;
      const tv = tripData?.vehicles?.find((v) => v.id === tripVehicleId);
      const pickup = tripData?.stops?.[0];

      const params: Record<string, string> = {};
      if (tv?.requested_vehicle_type) params["vehicle_type"] = tv.requested_vehicle_type;
      if (pickup?.lat && pickup?.lng) {
        params["lat"] = pickup.lat;
        params["lng"] = pickup.lng;
      }
      const { data: nearest, error } = await apiClient.GET("/v1/fleet/vehicles/nearest", {
        params: { query: params as never },
      });
      if (error) throw error;
      return nearest;
    },
    enabled: open,
  });

  const { data: offersData } = useQuery({
    queryKey: keys.trips.detail(tripId),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/trips/{id}", {
        params: { path: { id: tripId } },
      });
      if (error) throw error;
      return res;
    },
    enabled: open,
  });

  const offerMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const { data: res, error } = await apiClient.POST(
        "/v1/trips/vehicles/{vehicle_pk}/offer",
        {
          params: { path: { vehicle_pk: tripVehicleId } },
          body: { vendor_id: vendorId } as never,
        },
      );
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      addToast("Offer sent to vendor", "success");
      void qc.invalidateQueries({ queryKey: keys.dispatch.all() });
      onClose();
    },
    onError: (err) => {
      addToast(isApiError(err) ? (err as { message: string }).message : "Failed to send offer", "error");
    },
  });

  const nearestVehicles = (nearestData as unknown as Array<{
    vendor_id: string;
    vendor_name?: string;
    distance_km?: number;
  }> | undefined) ?? [];

  const offerHistory = (offersData as unknown as {
    vehicles?: Array<{
      id: string;
      offers?: Array<{ vendor_id: string; round: number; status: string }>;
    }>;
  } | undefined)?.vehicles?.find((v) => v.id === tripVehicleId)?.offers ?? [];

  const expiredByVendor = new Map<string, ExpiredRound[]>();
  for (const o of offerHistory) {
    if (o.status === "EXPIRED" || o.status === "WITHDRAWN") {
      if (!expiredByVendor.has(o.vendor_id)) expiredByVendor.set(o.vendor_id, []);
      expiredByVendor.get(o.vendor_id)!.push({ round: o.round, vendor_id: o.vendor_id });
    }
  }

  const suggestedVendors: SuggestedVendor[] = nearestVehicles.map((v) => ({
    vendor_id: v.vendor_id,
    vendor_name: v.vendor_name ?? v.vendor_id,
    nearest_vehicle_distance_km: v.distance_km ?? null,
    expired_rounds: expiredByVendor.get(v.vendor_id) ?? [],
  }));

  const activeOfferVendorIds = new Set(
    offerHistory.filter((o) => o.status === "OFFERED" || o.status === "ALERTED").map((o) => o.vendor_id),
  );

  const handleConfirm = () => {
    if (!selected) return;
    offerMutation.mutate(selected);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Select Vendor — Round ${currentRound}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Choose a vendor to offer this trip slot. Vendors who previously let an offer lapse can still be selected.
        </p>

        {isLoading ? (
          <div className="text-center py-6 text-sm text-text-secondary">Loading nearby vendors…</div>
        ) : suggestedVendors.length === 0 ? (
          <div className="text-center py-6 text-sm text-text-secondary">No vendors found for this vehicle type and location.</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {suggestedVendors.map((v) => {
              const hasActiveOffer = activeOfferVendorIds.has(v.vendor_id);
              const isSelected = selected === v.vendor_id;
              return (
                <button
                  key={v.vendor_id}
                  onClick={() => !hasActiveOffer && setSelected(isSelected ? null : v.vendor_id)}
                  disabled={hasActiveOffer}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    hasActiveOffer
                      ? "opacity-40 cursor-not-allowed bg-ops-bg border-border"
                      : isSelected
                      ? "bg-brand-blue/10 border-brand-blue ring-1 ring-brand-blue"
                      : "bg-white border-border hover:border-brand-blue/40 hover:bg-brand-blue/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{v.vendor_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {v.nearest_vehicle_distance_km != null && (
                          <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                            <MapPin className="w-3 h-3" />
                            {v.nearest_vehicle_distance_km.toFixed(1)} km away
                          </span>
                        )}
                        {v.expired_rounds.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            <AlertCircle className="w-3 h-3" />
                            Expired earlier · Round {v.expired_rounds.map((r) => r.round).join(", ")}
                          </span>
                        )}
                        {hasActiveOffer && (
                          <Badge variant="amber">Active offer</Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={!selected || offerMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-brand-blue text-white rounded-lg font-medium text-sm hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {offerMutation.isPending ? "Sending offer…" : "Confirm — Send Offer"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

SuggestedVendorsModal.displayName = "SuggestedVendorsModal";
