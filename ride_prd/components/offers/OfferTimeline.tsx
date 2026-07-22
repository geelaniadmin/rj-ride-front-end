"use client";

import React from "react";
import { Clock, CheckCircle2, XCircle, Bell, AlertCircle } from "lucide-react";

export interface OfferRound {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  round: number;
  status: string;
  offered_at: string | null;
  alerted_at?: string | null;
  responded_at?: string | null;
  expired_at?: string | null;
  note?: string;
}

interface OfferTimelineProps {
  rounds: OfferRound[];
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  OFFERED: {
    label: "Offered",
    icon: <Clock className="w-3.5 h-3.5" />,
    cls: "text-brand-blue bg-brand-blue/10 border-brand-blue/20",
  },
  ALERTED: {
    label: "Alerted",
    icon: <Bell className="w-3.5 h-3.5" />,
    cls: "text-amber-700 bg-amber-50 border-amber-200",
  },
  ACCEPTED: {
    label: "Accepted",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    cls: "text-success bg-success/10 border-success/20",
  },
  EXPIRED: {
    label: "Expired",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    cls: "text-text-secondary bg-ops-bg border-border",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: <XCircle className="w-3.5 h-3.5" />,
    cls: "text-danger bg-danger/10 border-danger/20",
  },
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export const OfferTimeline: React.FC<OfferTimelineProps> = ({ rounds }) => {
  if (!rounds.length) {
    return <p className="text-xs text-text-secondary italic">No offer rounds yet.</p>;
  }

  const sorted = [...rounds].sort((a, b) => a.round - b.round);

  return (
    <div className="space-y-3">
      {sorted.map((r) => {
        const meta = STATUS_META[r.status] ?? {
          label: r.status,
          icon: <Clock className="w-3.5 h-3.5" />,
          cls: "text-text-secondary bg-ops-bg border-border",
        };
        return (
          <div key={r.id} className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                {meta.icon}
              </div>
              {sorted.indexOf(r) < sorted.length - 1 && (
                <div className="w-0.5 h-4 bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-text-primary">Round {r.round}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${meta.cls}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              {r.vendor_name && (
                <p className="text-xs text-text-secondary mt-0.5 truncate">{r.vendor_name}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-text-secondary">
                {r.offered_at && <span>Offered {fmt(r.offered_at)}</span>}
                {r.alerted_at && <span>· Alerted {fmt(r.alerted_at)}</span>}
                {r.responded_at && <span>· Responded {fmt(r.responded_at)}</span>}
                {r.expired_at && <span>· Expired {fmt(r.expired_at)}</span>}
              </div>
              {r.note && <p className="text-[11px] text-text-secondary mt-0.5 italic">{r.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

OfferTimeline.displayName = "OfferTimeline";
