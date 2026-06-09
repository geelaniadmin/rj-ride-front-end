"use client";

import React, { useMemo, useState } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useCustomerStore } from "@/stores/customerStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/stores/toastStore";
import { Eye } from "lucide-react";

export const BillingLedger: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allBillingTrips = useBillingStore((s) => s.billableTrips);
  const getOperatorFeeConfig = useBillingStore((s) => s.getOperatorFeeConfig);
  const updateBillingLineStatus = useBillingStore((s) => s.updateBillingLineStatus);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const addToast = useToastStore((s) => s.addToast);

  const [filterStatus, setFilterStatus] = useState<string>("UNBILLED");
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  const billingTrips = useMemo(() => allBillingTrips.filter((t) => t.tenantId === activeTenantId), [allBillingTrips, activeTenantId]);
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);

  const filteredTrips = useMemo(
    () => billingTrips.filter((t) => !filterStatus || t.status === filterStatus),
    [billingTrips, filterStatus]
  );

  const operatorFeeConfig = getOperatorFeeConfig(activeTenantId);

  const stats = useMemo(() => {
    return {
      total: billingTrips.length,
      unbilled: billingTrips.filter((t) => t.status === "UNBILLED").length,
      statemented: billingTrips.filter((t) => t.status === "STATEMENTED").length,
      reconciled: billingTrips.filter((t) => t.status === "RECONCILED").length,
      totalRevenue: billingTrips.reduce((sum, t) => sum + t.total, 0),
    };
  }, [billingTrips]);

  const handleStatement = (tripId: string) => {
    const trip = billingTrips.find((t) => t.id === tripId);
    if (!trip) return;

    trip.lines.forEach((line) => {
      updateBillingLineStatus(line.id, "STATEMENTED", new Date().toISOString());
    });

    addToast("Trip marked as statemented", "success");
  };

  const selectedTripData = billingTrips.find((t) => t.id === selectedTrip);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Total Trips</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Unbilled</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.unbilled}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Statemented</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.statemented}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Reconciled</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.reconciled}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Operator Fee Config */}
      <Card padding="lg" header={<h3 className="font-semibold">⚙️ Operator Fee Config</h3>}>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex gap-2">
            <span className="font-medium text-text-secondary">Type:</span>
            <Badge variant={operatorFeeConfig.type === "FLAT" ? "blue" : operatorFeeConfig.type === "PERCENT" ? "green" : "purple"}>
              {operatorFeeConfig.type}
            </Badge>
          </div>
          {operatorFeeConfig.type === "FLAT" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">Amount:</span>
              <span>₹{operatorFeeConfig.amount}</span>
            </div>
          )}
          {operatorFeeConfig.type === "PERCENT" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">Percentage:</span>
              <span>{operatorFeeConfig.amount}%</span>
            </div>
          )}
          {operatorFeeConfig.type === "TIERED" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">Tiers:</span>
              <div className="text-xs">
                {operatorFeeConfig.tiers?.map((tier, i) => (
                  <div key={i}>
                    ₹{tier.minAmount}–{tier.maxAmount || "∞"}: {tier.feePercent}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filter */}
      <Card padding="lg" header={<h3 className="font-semibold">🔍 Filter</h3>}>
        <Select
          options={[
            { value: "", label: "All Statuses" },
            { value: "UNBILLED", label: "Unbilled" },
            { value: "STATEMENTED", label: "Statemented" },
            { value: "RECONCILED", label: "Reconciled" },
          ]}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
      </Card>

      {/* Ledger Table */}
      <Card padding="lg" header={<h3 className="font-semibold">📊 Billable Trips Ledger</h3>}>
        {filteredTrips.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">No trips</p>
        ) : (
          <div className="space-y-2">
            {filteredTrips.map((trip) => {
              const customer = customers.find((c) => c.id === trip.customerId);
              return (
                <div key={trip.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{customer?.name || trip.customerId}</p>
                      <p className="text-xs text-text-secondary">Trip: {trip.tripId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={trip.status === "UNBILLED" ? "amber" : trip.status === "STATEMENTED" ? "blue" : "green"}>
                        {trip.status}
                      </Badge>
                      <button onClick={() => setSelectedTrip(trip.id)} className="text-indigo-400 hover:text-indigo-300">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-text-secondary">Subtotal</p>
                      <p className="text-text-primary">{trip.currency} {trip.subtotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Operator Fee</p>
                      <p className="text-amber-400">{trip.currency} {trip.operatorFee.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Total</p>
                      <p className="text-green-400 font-medium">{trip.currency} {trip.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Lines</p>
                      <p className="text-text-primary">{trip.lines.length}</p>
                    </div>
                  </div>

                  {trip.status === "UNBILLED" && (
                    <Button onClick={() => handleStatement(trip.id)} variant="secondary" size="sm" className="w-full">
                      Mark as Statemented
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Trip Details */}
      {selectedTripData && (
        <Card padding="lg" header={<h3 className="font-semibold">📋 Trip Details</h3>}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Status:</span>
              <Badge variant={selectedTripData.status === "UNBILLED" ? "amber" : selectedTripData.status === "STATEMENTED" ? "blue" : "green"}>
                {selectedTripData.status}
              </Badge>
            </div>

            <div className="border-t border-border pt-3">
              <p className="font-medium text-text-secondary mb-2">Billing Lines ({selectedTripData.lines.length})</p>
              <div className="space-y-2">
                {selectedTripData.lines.map((line) => (
                  <div key={line.id} className="p-2 bg-ops-sidebar rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Vehicle {line.vehicleId.slice(-3)}</span>
                      <Badge variant="blue">{line.status}</Badge>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Price ID: {line.priceId}</span>
                      <span className="font-mono text-green-400">{line.currency} {line.lockedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-tertiary">Rate Card v{line.lockedRateCardVersion}</span>
                      <span className="text-success text-[10px] flex items-center gap-1">
                        <span>✓</span> Billed from locked quote
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-text-secondary">Subtotal</p>
                <p className="text-lg font-bold text-text-primary">{selectedTripData.currency} {selectedTripData.subtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">Operator Fee</p>
                <p className="text-lg font-bold text-amber-400">{selectedTripData.currency} {selectedTripData.operatorFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">Total</p>
                <p className="text-lg font-bold text-green-400">{selectedTripData.currency} {selectedTripData.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button onClick={() => setSelectedTrip(null)} className="text-sm text-text-secondary hover:text-text-primary mt-4">
            Close
          </button>
        </Card>
      )}
    </div>
  );
};

BillingLedger.displayName = "BillingLedger";
