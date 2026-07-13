"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSessionStore, useEarningsStore, usePayoutStore, useLanguageStore, t } from "@ride/shared";
import { useVendorTrips } from "@/hooks/useVendorTrips";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";

const EarningsChart = dynamic(
  () => import("@/components/earnings/EarningsChart").then((m) => m.EarningsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);
import {
  DollarSign, TrendingUp, Receipt, BarChart3,
  ChevronDown, Calendar, Clock
} from "lucide-react";

type Period = "today" | "week" | "month" | "lastMonth";

const PERIOD_OPTIONS = [
  { value: "today" as const, labelKey: "today" as const },
  { value: "week" as const, labelKey: "thisWeek" as const },
  { value: "month" as const, labelKey: "thisMonth" as const },
  { value: "lastMonth" as const, labelKey: "lastMonth" as const },
] as const;

export default function EarningsPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const earnings = useEarningsStore((s) => s.earnings);
  const getPayoutsForVendor = usePayoutStore((s) => s.getPayoutsForVendor);
  const language = useLanguageStore((s) => s.language);

  if (!vendorSession) return null;

  const vendorId = vendorSession.vendorId;
  const [period, setPeriod] = useState<Period>("month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const { vendorTrips } = useVendorTrips(vendorId);

  const vendorEarnings = useMemo(
    () => earnings.filter((e) => e.vendorId === vendorId),
    [earnings, vendorId]
  );

  const filteredEarnings = useMemo(() => {
    const now = new Date();
    return vendorEarnings.filter((e) => {
      const d = new Date(e.completedAt);
      switch (period) {
        case "today":
          return d.toDateString() === now.toDateString();
        case "week": {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          return d >= weekStart;
        }
        case "month":
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case "lastMonth": {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        }
        default:
          return true;
      }
    });
  }, [vendorEarnings, period]);

  const totalEarnings = filteredEarnings.reduce((sum, e) => sum + e.netToVendor, 0);
  const totalFares = filteredEarnings.reduce((sum, e) => sum + e.fare, 0);
  const pendingAmount = vendorEarnings
    .filter((e) => e.status === "UNBILLED")
    .reduce((sum, e) => sum + e.netToVendor, 0);
  const completedCount = filteredEarnings.length;
  const avgPerTrip = completedCount > 0 ? Math.round(totalEarnings / completedCount) : 0;

  const payouts = useMemo(
    () => getPayoutsForVendor(vendorId),
    [getPayoutsForVendor, vendorId]
  );
  const totalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayoutsTotal = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  const chartData = useMemo(() => {
    const daily: Record<string, { date: string; ts: number; earnings: number; trips: number }> = {};
    for (const e of filteredEarnings) {
      const d = new Date(e.completedAt);
      const dateKey = d.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short",
      });
      if (!daily[dateKey]) {
        daily[dateKey] = { date: dateKey, ts: d.getTime(), earnings: 0, trips: 0 };
      }
      daily[dateKey].earnings += e.netToVendor;
      daily[dateKey].trips += 1;
    }
    return Object.values(daily).sort((a, b) => a.ts - b.ts);
  }, [filteredEarnings]);

  const findTripForEarning = useCallback(
    (tripId: string) => vendorTrips.find((vt) => vt.tripId === tripId),
    [vendorTrips]
  );

  const matchedOption = PERIOD_OPTIONS.find((o) => o.value === period);
  const periodLabel = t(matchedOption?.labelKey ?? "thisMonth", language);

  const earningsColumns: Column<(typeof filteredEarnings)[0]>[] = [
    { key: "earningId", header: "Earning ID", render: (e) => <span className="font-mono text-xs">{e.earningId}</span>, sortable: true },
    { key: "date", header: t("date", language), render: (e) => <span className="text-sm">{new Date(e.completedAt).toLocaleDateString()}</span>, sortable: true },
    { key: "trip", header: t("trip", language), render: (e) => {
      const trip = findTripForEarning(e.tripId);
      return (
        <span className="font-mono text-xs text-text-muted">
          {e.tripId.slice(0, 8)}
          {trip && (
            <span className="text-text-muted ml-2">
              {trip.stops[0]?.address?.split(",")[0] || "?"} → {trip.stops[1]?.address?.split(",")[0] || "?"}
            </span>
          )}
        </span>
      );
    }},
    { key: "fare", header: t("fare", language), render: (e) => <span className="text-sm font-medium">₹{e.fare}</span>, sortable: true },
    { key: "operatorFee", header: t("operatorFeeLabel", language), render: (e) => <span className="text-sm text-text-muted">-₹{e.operatorFee}</span> },
    { key: "net", header: t("netToVendor", language), render: (e) => <span className="text-sm font-semibold text-success">₹{e.netToVendor}</span>, sortable: true },
    { key: "status", header: t("status", language), render: (e) => <StatusBadge status={e.status} />, sortable: true },
  ];

  const payoutColumns: Column<(typeof payouts)[0]>[] = [
    { key: "id", header: "Payout ID", render: (p) => <span className="font-mono text-xs">{p.id}</span>, sortable: true },
    { key: "date", header: t("date", language), render: (p) => <span className="text-sm">{new Date(p.payoutDate).toLocaleDateString()}</span>, sortable: true },
    { key: "period", header: t("period", language), render: (p) => (
      <span className="text-sm">
        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
      </span>
    )},
    { key: "trips", header: t("trips", language), render: (p) => <span className="text-sm">{p.tripsIncluded}</span>, sortable: true },
    { key: "amount", header: t("amount", language), render: (p) => <span className="text-sm font-semibold">₹{p.amount}</span>, sortable: true },
    { key: "status", header: t("status", language), render: (p) => <StatusBadge status={p.status} />, sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{t("earnings", language)}</h2>
          <p className="text-sm text-text-muted mt-1">{t("trackTripRevenue", language)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={`${t("earningsPeriod", language)} (${periodLabel})`} value={`₹${totalEarnings.toLocaleString()}`} icon={DollarSign} accentColor="text-brand-blue" />
        <KpiCard label={t("pendingPayout", language)} value={`₹${(pendingAmount + pendingPayoutsTotal).toLocaleString()}`} icon={Clock} accentColor="text-warning" />
        <KpiCard label={t("tripsCompleted", language)} value={completedCount} icon={Receipt} accentColor="text-success" />
        <KpiCard label={t("avgPerTrip", language)} value={`₹${avgPerTrip.toLocaleString()}`} icon={TrendingUp} accentColor="text-brand-blue" />
      </div>

      {/* Period Filter + Summary */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-blue" />
            <h3 className="font-semibold text-text-primary">{t("dailyEarnings", language)}</h3>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-page-bg border border-border rounded-lg text-sm text-text-primary hover:bg-ops-bg transition-colors"
            >
              <Calendar className="w-4 h-4 text-text-muted" />
              {periodLabel}
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>

            {showPeriodDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPeriodDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-card-bg border border-border rounded-lg shadow-lg z-20 py-1">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setPeriod(opt.value); setShowPeriodDropdown(false); }}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-ops-bg transition-colors ${
                        period === opt.value ? "text-brand-blue font-medium" : "text-text-primary"
                      }`}
                    >
                      {t(opt.labelKey, language)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <BarChart3 className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-muted">{t("noEarningsData", language)}</p>
            <p className="text-xs text-text-muted mt-1">{t("earningsAppearWhenAdminMarks", language)}</p>
          </div>
        ) : (
          <EarningsChart data={chartData} />
        )}

        {completedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-muted text-xs">{t("grossFares", language)}</p>
              <p className="text-text-primary font-semibold">₹{totalFares.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">{t("operatorFeeLabel", language)}</p>
              <p className="text-text-primary font-semibold">₹{(totalFares - totalEarnings).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">{t("netToYou", language)}</p>
              <p className="text-success font-semibold">₹{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Earnings Table */}
      <div>
        <h3 className="font-semibold text-text-primary mb-4">{t("completedTrips", language)}</h3>
        <DataTable columns={earningsColumns} data={filteredEarnings} pageSize={10} emptyMessage={t("noCompletedTrips", language)} />
      </div>

      {/* Payout History */}
      <div>
        <h3 className="font-semibold text-text-primary mb-4">{t("payoutHistory", language)}</h3>
        <DataTable
          columns={payoutColumns}
          data={payouts}
          pageSize={10}
          emptyMessage={vendorEarnings.length === 0 ? t("noPayoutsYet", language) : t("noPayoutHistory", language)}
        />
      </div>

      {payouts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">{t("totalPaidOut", language)}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">{t("pendingPayouts", language)}</p>
            <p className="text-2xl font-bold text-warning mt-1">₹{(pendingAmount + pendingPayoutsTotal).toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">{t("nextCycle", language)}</p>
            <p className="text-lg font-bold text-text-primary mt-1">
              {pendingAmount > 0 ? `₹${pendingAmount.toLocaleString()} ${t("unbilled", language)}` : t("upToDate", language)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
