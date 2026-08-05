"use client";

import React, { useMemo, useState } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { useTripStore } from "@/stores/tripStore";
import { useTenantStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/stores/toastStore";
import { FileText, Plus, ExternalLink } from "lucide-react";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
];

export const VoucherManager: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId && t.status === "COMPLETED"), [allTrips, activeTenantId]);

  const generateVouchers = useBillingStore((s) => s.generateVouchers);
  const getVouchersByTrip = useBillingStore((s) => s.getVouchersByTrip);
  const allVouchers = useBillingStore((s) => s.vouchers);
  const addToast = useToastStore((s) => s.addToast);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [language, setLanguage] = useState("en");

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const selectedVouchers = selectedTripId ? getVouchersByTrip(selectedTripId) : [];

  const stats = useMemo(() => {
    return {
      total: allVouchers.length,
      tripVouchers: allVouchers.filter((v) => v.type === "TRIP").length,
      paxVouchers: allVouchers.filter((v) => v.type === "PAX").length,
    };
  }, [allVouchers]);

  const handleGenerateVouchers = () => {
    if (!selectedTripId) {
      addToast("Select a trip", "error");
      return;
    }

    const trip = trips.find((t) => t.id === selectedTripId);
    if (!trip) return;

    // Get pax IDs from all vehicles in the trip
    const paxIds = trip.vehicles.flatMap((v) => v.pax.map((p) => p.id));

    const vouchers = generateVouchers(selectedTripId, paxIds, language);
    addToast(`Generated ${vouchers.length} vouchers`, "success");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Total Vouchers</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Trip Vouchers</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.tripVouchers}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Pax Vouchers</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.paxVouchers}</p>
        </div>
      </div>

      {/* Generator */}
      <Card padding="lg" header={<h3 className="font-semibold">🎟️ Generate Vouchers</h3>}>
        <div className="space-y-4">
          <FormField label="Completed Trip" required hint={`${trips.length} trips available`}>
            <Select
              options={[{ value: "", label: "Select a trip..." }, ...trips.map((t) => ({ value: t.id, label: t.reference || t.id.slice(0, 8) }))]}
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            />
          </FormField>

          <FormField label="Language" required>
            <Select options={LANGUAGES} value={language} onChange={(e) => setLanguage(e.target.value)} />
          </FormField>

          {selectedTrip && (
            <div className="bg-ops-bg rounded p-3 text-sm space-y-2">
              <p className="text-text-secondary">
                Trip: <span className="text-text-primary font-mono">{selectedTrip.reference || selectedTrip.id.slice(0, 8)}</span>
              </p>
              <p className="text-text-secondary">
                Passengers: <span className="text-text-primary">{selectedTrip.vehicles.reduce((sum, v) => sum + v.pax.length, 0)}</span>
              </p>
              <p className="text-text-secondary">
                Will generate: <span className="text-text-primary">{selectedTrip.vehicles.reduce((sum, v) => sum + v.pax.length, 0) + 1} vouchers</span>
              </p>
            </div>
          )}

          <Button onClick={handleGenerateVouchers} variant="primary" disabled={!selectedTripId} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Generate Vouchers
          </Button>
        </div>
      </Card>

      {/* Vouchers List */}
      {selectedVouchers.length > 0 && (
        <Card padding="lg" header={<h3 className="font-semibold">📄 Generated Vouchers ({selectedVouchers.length})</h3>}>
          <div className="space-y-2">
            {selectedVouchers.map((voucher) => (
              <div key={voucher.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-text-primary">
                      {voucher.type === "TRIP" ? "Trip Voucher" : `Passenger Voucher (${voucher.passengerPaxId?.slice(0, 4)})`}
                    </span>
                  </div>
                  <Badge variant={voucher.type === "TRIP" ? "blue" : "purple"}>{voucher.type}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-text-secondary">Amount</p>
                    <p className="text-text-primary">{voucher.currency} {voucher.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Language</p>
                    <p className="text-text-primary">{voucher.language.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Generated</p>
                    <p className="text-text-primary">{new Date(voucher.generatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {voucher.documentUrl && (
                  <a
                    href={voucher.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    <ExternalLink className="w-3 h-3" /> View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Vouchers Summary */}
      {allVouchers.length > 0 && selectedVouchers.length === 0 && (
        <Card padding="lg" header={<h3 className="font-semibold">📊 All Vouchers Summary</h3>}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Total Generated</span>
              <span className="text-text-primary font-medium">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Trip-Level Vouchers</span>
              <span className="text-text-primary font-medium">{stats.tripVouchers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Passenger-Level Vouchers</span>
              <span className="text-text-primary font-medium">{stats.paxVouchers}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-text-secondary">Average per Trip</span>
              <span className="text-text-primary font-medium">{(stats.total / Math.max(1, Math.ceil(stats.total / 2))).toFixed(1)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Multi-Language Info */}
      <Card padding="lg" className="bg-ops-bg/50">
        <div className="space-y-2 text-xs text-text-primary">
          <p className="font-medium text-text-primary">📌 Multi-Language Vouchers</p>
          <p>Vouchers are generated in the selected language. Documents are links to mock PDFs that would be generated in a real system.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {LANGUAGES.map((lang) => (
              <Badge key={lang.value} variant="blue">
                {lang.label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

VoucherManager.displayName = "VoucherManager";
