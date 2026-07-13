"use client";

import React, { useMemo, useState } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useBillingStore } from "@/stores/billingStore";
import { useTenantStore } from "@ride/shared";
import { useCustomerStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/stores/toastStore";
import { Eye } from "lucide-react";

export const BillingLedger: React.FC = () => {
  const language = useLanguageStore((s) => s.language);
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

    addToast(t("tripMarkedStatemented", language), "success");
  };

  const selectedTripData = billingTrips.find((t) => t.id === selectedTrip);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">{t("totalTrips", language)}</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">{t("unbilled", language)}</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.unbilled}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">{t("statusStatemented", language)}</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.statemented}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">{t("statusReconciled", language)}</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.reconciled}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">{t("totalRevenue", language)}</p>
          <p className="text-2xl font-bold text-white mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Operator Fee Config */}
      <Card padding="lg" header={<h3 className="font-semibold">{t("operatorFeeConfig", language)}</h3>}>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex gap-2">
            <span className="font-medium text-text-secondary">{t("typeWithColon", language)}</span>
            <Badge variant={operatorFeeConfig.type === "FLAT" ? "blue" : operatorFeeConfig.type === "PERCENT" ? "green" : "purple"}>
              {operatorFeeConfig.type}
            </Badge>
          </div>
          {operatorFeeConfig.type === "FLAT" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">{t("amountWithColon", language)}</span>
              <span>₹{operatorFeeConfig.amount}</span>
            </div>
          )}
          {operatorFeeConfig.type === "PERCENT" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">{t("percentageWithColon", language)}</span>
              <span>{operatorFeeConfig.amount}%</span>
            </div>
          )}
          {operatorFeeConfig.type === "TIERED" && (
            <div className="flex gap-2">
              <span className="font-medium text-text-secondary">{t("tiers", language)}</span>
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
      <Card padding="lg" header={<h3 className="font-semibold">{t("filterHeader", language)}</h3>}>
        <Select
          options={[
            { value: "", label: t("allStatuses", language) },
            { value: "UNBILLED", label: t("unbilled", language) },
            { value: "STATEMENTED", label: t("statusStatemented", language) },
            { value: "RECONCILED", label: t("statusReconciled", language) },
          ]}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
      </Card>

      {/* Ledger Table */}
      <Card padding="lg" header={<h3 className="font-semibold">{t("billableTripsLedger", language)}</h3>}>
        {filteredTrips.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">{t("noTrips", language)}</p>
        ) : (
          <div className="space-y-2">
            {filteredTrips.map((trip) => {
              const customer = customers.find((c) => c.id === trip.customerId);
              return (
                <div key={trip.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{customer?.name || trip.customerId}</p>
                      <p className="text-xs text-text-secondary">{t("tripWithColon", language)} {trip.tripId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={trip.status === "UNBILLED" ? "amber" : trip.status === "STATEMENTED" ? "blue" : "green"}>
                        {trip.status === "UNBILLED" ? t("unbilled", language) : trip.status === "STATEMENTED" ? t("statusStatemented", language) : t("statusReconciled", language)}
                      </Badge>
                      <button onClick={() => setSelectedTrip(trip.id)} className="text-indigo-400 hover:text-indigo-300">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-text-secondary">{t("subtotal", language)}</p>
                      <p className="text-text-primary">{trip.currency} {trip.subtotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">{t("operatorFeeLabel", language)}</p>
                      <p className="text-amber-400">{trip.currency} {trip.operatorFee.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">{t("total", language)}</p>
                      <p className="text-green-400 font-medium">{trip.currency} {trip.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">{t("lines", language)}</p>
                      <p className="text-text-primary">{trip.lines.length}</p>
                    </div>
                  </div>

                  {trip.status === "UNBILLED" && (
                    <Button onClick={() => handleStatement(trip.id)} variant="secondary" size="sm" className="w-full">
                      {t("markAsStatemented", language)}
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
        <Card padding="lg" header={<h3 className="font-semibold">{t("tripDetails", language)}</h3>}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("statusWithColon", language)}</span>
              <Badge variant={selectedTripData.status === "UNBILLED" ? "amber" : selectedTripData.status === "STATEMENTED" ? "blue" : "green"}>
                {selectedTripData.status === "UNBILLED" ? t("unbilled", language) : selectedTripData.status === "STATEMENTED" ? t("statusStatemented", language) : t("statusReconciled", language)}
              </Badge>
            </div>

            <div className="border-t border-border pt-3">
              <p className="font-medium text-text-secondary mb-2">{t("billingLines", language)} ({selectedTripData.lines.length})</p>
              <div className="space-y-2">
                {selectedTripData.lines.map((line) => (
                  <div key={line.id} className="p-2 bg-ops-sidebar rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">{t("vehicleNum", language).replace("{num}", line.vehicleId.slice(-3))}</span>
                      <Badge variant="blue">{line.status}</Badge>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>{t("priceId", language)}: {line.priceId}</span>
                      <span className="font-mono text-green-400">{line.currency} {line.lockedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-tertiary">{t("rateCardV", language)} {line.lockedRateCardVersion}</span>
                      <span className="text-success text-[10px] flex items-center gap-1">
                        <span>✓</span> {t("billedFromQuote", language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-text-secondary">{t("subtotal", language)}</p>
                <p className="text-lg font-bold text-text-primary">{selectedTripData.currency} {selectedTripData.subtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">{t("operatorFeeLabel", language)}</p>
                <p className="text-lg font-bold text-amber-400">{selectedTripData.currency} {selectedTripData.operatorFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">{t("total", language)}</p>
                <p className="text-lg font-bold text-green-400">{selectedTripData.currency} {selectedTripData.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button onClick={() => setSelectedTrip(null)} className="text-sm text-text-secondary hover:text-text-primary mt-4">
            {t("close", language)}
          </button>
        </Card>
      )}
    </div>
  );
};

BillingLedger.displayName = "BillingLedger";
