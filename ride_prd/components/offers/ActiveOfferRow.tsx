"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError, useCountdown } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Bell, X, Clock, AlertCircle } from "lucide-react";

export interface ActiveOffer {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  round: number;
  status: string;
  offered_at: string;
  alerted_at?: string | null;
  expires_at: string;
  expires_alert_at?: string | null;
  alert_count?: number;
}

interface Props {
  offer: ActiveOffer;
  tripVehicleId: string;
  onReAllocate?: () => void;
}

export const ActiveOfferRow: React.FC<Props> = ({ offer, tripVehicleId, onReAllocate }) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();
  const [alertCount, setAlertCount] = useState(offer.alert_count ?? 0);
  const countdown = useCountdown(offer.expires_at);

  const isExpired = offer.status === "EXPIRED" || offer.status === "WITHDRAWN" || countdown.expired;
  const isAlerted = offer.status === "ALERTED";

  const alertMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error } = await apiClient.POST(
        "/v1/offers/{id}/alert" as never,
        { params: { path: { id: offer.id } } } as never,
      );
      if (error) throw error;
      return res;
    },
    onMutate: () => {
      setAlertCount((c) => c + 1);
    },
    onSuccess: () => {
      addToast("Alert sent to vendor", "success");
      void qc.invalidateQueries({ queryKey: keys.dispatch.all() });
    },
    onError: (err) => {
      setAlertCount((c) => Math.max(0, c - 1));
      if (isApiError(err) && (err as { status?: number }).status === 429) {
        addToast("Alert just sent — wait a moment before sending another", "info");
      } else {
        addToast(isApiError(err) ? (err as { message: string }).message : "Failed to send alert", "error");
      }
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error } = await apiClient.POST(
        "/v1/offers/{id}/withdraw",
        {
          params: { path: { id: offer.id } },
          body: { note: "Withdrawn by ops" } as never,
        },
      );
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      addToast("Offer withdrawn", "success");
      void qc.invalidateQueries({ queryKey: keys.dispatch.all() });
    },
    onError: (err) => {
      addToast(isApiError(err) ? (err as { message: string }).message : "Withdraw failed", "error");
    },
  });

  return (
    <div
      className={`p-3 rounded-xl border text-sm ${
        isExpired
          ? "bg-ops-bg border-border opacity-70"
          : isAlerted
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary text-xs">
              Round {offer.round}
            </span>
            {offer.vendor_name && (
              <span className="text-xs text-text-secondary truncate max-w-[120px]">
                {offer.vendor_name}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                isExpired
                  ? "text-text-secondary bg-ops-bg border-border"
                  : isAlerted
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-brand-blue bg-brand-blue/10 border-brand-blue/20"
              }`}
            >
              {isAlerted ? (
                <><Bell className="w-3 h-3" /> Alerted</>
              ) : isExpired ? (
                <><AlertCircle className="w-3 h-3" /> {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}</>
              ) : (
                <><Clock className="w-3 h-3" /> Offered</>
              )}
            </span>
          </div>

          {!isExpired && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-mono font-semibold ${countdown.urgent ? "text-danger" : "text-text-secondary"}`}>
              <Clock className="w-3 h-3" />
              {countdown.mmss}
              {countdown.urgent && <span className="font-sans font-normal text-[11px] ml-1 text-danger">urgent</span>}
            </div>
          )}

          {alertCount > 0 && (
            <p className="text-[11px] text-text-secondary mt-0.5">
              {alertCount} alert{alertCount > 1 ? "s" : ""} sent
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isExpired && onReAllocate && (
            <button
              onClick={onReAllocate}
              className="px-2.5 py-1.5 text-xs bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-lg hover:bg-brand-blue/20 transition-colors font-medium"
            >
              Re-allocate
            </button>
          )}
          {!isExpired && (
            <>
              <button
                onClick={() => alertMutation.mutate()}
                disabled={alertMutation.isPending}
                title="Send manual alert to vendor"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium disabled:opacity-50"
              >
                <Bell className="w-3 h-3" />
                Alert
              </button>
              <button
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                title="Withdraw offer"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/20 transition-colors font-medium disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                Withdraw
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ActiveOfferRow.displayName = "ActiveOfferRow";
