"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSessionStore, useEarningsStore, usePayoutStore } from "@ride/shared";
import { useVendorTrips } from "@/hooks/useVendorTrips";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  DollarSign, TrendingUp, Receipt, BarChart3,
  ChevronDown, Calendar, Clock
} from "lucide-react";

type Period = "today" | "week" | "month" | "lastMonth";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

export default function EarningsPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const earnings = useEarningsStore((s) => s.earnings);
  const getPayoutsForVendor = usePayoutStore((s) => s.getPayoutsForVendor);


  if (!vendorSession) return null;

  const vendorId = vendorSession.vendorId;
  const [period, setPeriod] = useState<Period>("month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Get all completed vendor trips for trip detail lookups
  const { vendorTrips } = useVendorTrips(vendorId);

  // Filter earnings by vendor and period
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

  // KPI calculations
  const totalEarnings = filteredEarnings.reduce((sum, e) => sum + e.netToVendor, 0);
  const totalFares = filteredEarnings.reduce((sum, e) => sum + e.fare, 0);
  const pendingAmount = vendorEarnings
    .filter((e) => e.status === "UNBILLED")
    .reduce((sum, e) => sum + e.netToVendor, 0);
  const completedCount = filteredEarnings.length;
  const avgPerTrip = completedCount > 0 ? Math.round(totalEarnings / completedCount) : 0;

  // Payout history
  const payouts = useMemo(
    () => getPayoutsForVendor(vendorId),
    [getPayoutsForVendor, vendorId]
  );
  const totalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  // Chart data: daily aggregates for the selected period
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

  // Find trip details for an earning
  const findTripForEarning = useCallback(
    (tripId: string) => vendorTrips.find((vt) => vt.tripId === tripId),
    [vendorTrips]
  );

  // Earnings table columns
  const earningsColumns: Column<(typeof filteredEarnings)[0]>[] = [
    {
      key: "earningId", header: "Earning ID", render: (e) => (
        <span className="font-mono text-xs">{e.earningId}</span>
      ), sortable: true,
    },
    {
      key: "date", header: "Date", render: (e) => (
        <span className="text-sm">{new Date(e.completedAt).toLocaleDateString()}</span>
      ), sortable: true,
    },
    {
      key: "trip", header: "Trip", render: (e) => {
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
      },
    },
    {
      key: "fare", header: "Fare", render: (e) => (
        <span className="text-sm font-medium">₹{e.fare}</span>
      ), sortable: true,
    },
    {
      key: "operatorFee", header: "Operator Fee (15%)", render: (e) => (
        <span className="text-sm text-text-muted">-₹{e.operatorFee}</span>
      ),
    },
    {
      key: "net", header: "Net to Vendor", render: (e) => (
        <span className="text-sm font-semibold text-success">₹{e.netToVendor}</span>
      ), sortable: true,
    },
    {
      key: "status", header: "Status", render: (e) => (
        <StatusBadge status={e.status} />
      ), sortable: true,
    },
  ];

  // Payout table columns
  const payoutColumns: Column<(typeof payouts)[0]>[] = [
    { key: "id", header: "Payout ID", render: (p) => <span className="font-mono text-xs">{p.id}</span>, sortable: true },
    { key: "date", header: "Date", render: (p) => <span className="text-sm">{new Date(p.payoutDate).toLocaleDateString()}</span>, sortable: true },
    { key: "period", header: "Period", render: (p) => (
      <span className="text-sm">
        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
      </span>
    )},
    { key: "trips", header: "Trips", render: (p) => <span className="text-sm">{p.tripsIncluded}</span>, sortable: true },
    { key: "amount", header: "Amount", render: (p) => <span className="text-sm font-semibold">₹{p.amount}</span>, sortable: true },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} />, sortable: true },
  ];

  // Chart colors
  const chartColors = {
    earnings: "#2563eb", // brand-blue
    earningsHover: "#1d4ed8",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Earnings</h2>
          <p className="text-sm text-text-muted mt-1">
            Track trip revenue, operator fees, and payout history
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={`Earnings (${PERIOD_OPTIONS.find((o) => o.value === period)?.label || ""})`}
          value={`₹${totalEarnings.toLocaleString()}`}
          icon={DollarSign}
          accentColor="text-brand-blue"
        />
        <KpiCard
          label="Pending Payout"
          value={`₹${(pendingAmount + pendingPayouts).toLocaleString()}`}
          icon={Clock}
          accentColor="text-warning"
        />
        <KpiCard
          label="Trips Completed"
          value={completedCount}
          icon={Receipt}
          accentColor="text-success"
        />
        <KpiCard
          label="Avg per Trip"
          value={`₹${avgPerTrip.toLocaleString()}`}
          icon={TrendingUp}
          accentColor="text-brand-blue"
        />
      </div>

      {/* Period Filter + Summary */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-blue" />
            <h3 className="font-semibold text-text-primary">Daily Earnings</h3>
          </div>

          {/* Period dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-page-bg border border-border rounded-lg text-sm text-text-primary hover:bg-ops-bg transition-colors"
            >
              <Calendar className="w-4 h-4 text-text-muted" />
              {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
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
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        {chartData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <BarChart3 className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-muted">No earnings data for this period</p>
            <p className="text-xs text-text-muted mt-1">
              Earnings appear here when admin marks trips as completed
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                  formatter={(value: any) => [`₹${(value as number).toLocaleString()}`, 'Earnings']}
                  labelFormatter={(label: any) => `Date: ${label}`}
                />
                <Bar
                  dataKey="earnings"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={chartColors.earnings} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Period summary */}
        {completedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-muted text-xs">Gross Fares</p>
              <p className="text-text-primary font-semibold">₹{totalFares.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Operator Fee (15%)</p>
              <p className="text-text-primary font-semibold">₹{(totalFares - totalEarnings).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Net to You</p>
              <p className="text-success font-semibold">₹{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Earnings Table */}
      <div>
        <h3 className="font-semibold text-text-primary mb-4">Completed Trips</h3>
        <DataTable
          columns={earningsColumns}
          data={filteredEarnings}
          pageSize={10}
          emptyMessage="No completed trips yet. Earnings appear here when trips are completed and billed."
        />
      </div>

      {/* Payout History */}
      <div>
        <h3 className="font-semibold text-text-primary mb-4">Payout History</h3>
        <DataTable
          columns={payoutColumns}
          data={payouts}
          pageSize={10}
          emptyMessage={
            vendorEarnings.length === 0
              ? "No payouts yet. Earnings appear first, then payouts are processed on your billing cycle."
              : "No payout history yet. Your earnings will be paid out on your billing cycle."
          }
        />
      </div>

      {/* Summary cards at the bottom */}
      {payouts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">Total Paid Out</p>
            <p className="text-2xl font-bold text-text-primary mt-1">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">Pending Payouts</p>
            <p className="text-2xl font-bold text-warning mt-1">₹{(pendingAmount + pendingPayouts).toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <p className="text-sm text-text-muted">Next Cycle</p>
            <p className="text-lg font-bold text-text-primary mt-1">
              {pendingAmount > 0
                ? `₹${pendingAmount.toLocaleString()} unbilled`
                : "Up to date"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
