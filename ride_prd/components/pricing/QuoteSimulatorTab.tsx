"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useVendorStore } from "@/stores/vendorStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { getOffers, getOfferDetails, QuoteInput } from "@/lib/quote";
import { Offer } from "@/lib/types";

interface QuoteSimulatorTabProps {
  searchQuery?: string;
}

export const QuoteSimulatorTab: React.FC<QuoteSimulatorTabProps> = ({ searchQuery = "" }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allVendors = useVendorStore((s) => s.vendors) || [];
  const vendors = useMemo(() => allVendors.filter((v) => v.tenantId === activeTenantId), [allVendors, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);

  const addToast = useToastStore((s) => s.addToast);

  const [vendorId, setVendorId] = useState<string>(((vendors?.[0]?.id as string | undefined) || "") as string);
  const [customerId, setCustomerId] = useState<string>(((customers?.[0]?.id as string | undefined) || "") as string);
  const [vehicleTypeId, setVehicleTypeId] = useState<string>(((vts?.[0]?.id as string | undefined) || "") as string);
  const [distance, setDistance] = useState(10);
  const [hours, setHours] = useState(1);
  const [quotedAt, setQuotedAt] = useState<string>((new Date().toISOString().split("T")[0] || "") as string);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [validityCountdowns, setValidityCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: Record<string, number> = {};
      offers.forEach((offer) => {
        const { validityMins } = getOfferDetails(offer);
        newCountdowns[offer.priceId] = validityMins;
      });
      setValidityCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [offers]);

  const handleGetOffers = () => {
    if (!vendorId || !customerId || !vehicleTypeId) {
      addToast("Please select vendor, customer, and vehicle type", "error");
      return;
    }

    const input: QuoteInput = {
      tenantId: activeTenantId,
      vendorId,
      customerId,
      vehicleTypeId,
      quotedAt,
      currency: "INR",
      distance,
      hours,
    };

    const results = getOffers(input);
    if (results.length === 0) {
      addToast("No applicable rate card found for the selected combination", "info");
    } else {
      addToast(`Got ${results.length} offer(s)`, "success");
    }
    setOffers(results);
  };

  return (
    <div className="space-y-6">
      <Card padding="lg" header={<h3 className="font-semibold">Quote Parameters</h3>}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Vendor">
            <Select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label="Customer">
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label="Vehicle Type">
            <Select
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              options={vts.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label="Quote Date">
            <Input type="date" value={quotedAt} onChange={(e) => setQuotedAt(e.target.value)} />
          </FormField>

          <FormField label="Distance (KM)">
            <Input type="number" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value) || 0)} />
          </FormField>

          <FormField label="Hours">
            <Input type="number" value={hours} onChange={(e) => setHours(parseFloat(e.target.value) || 0)} step="0.5" />
          </FormField>
        </div>

        <Button onClick={handleGetOffers} variant="primary" className="mt-4">
          Get Offers
        </Button>
      </Card>

      {offers.length > 0 && (
        <Card padding="lg" header={<h3 className="font-semibold">Offers ({offers.length})</h3>}>
          <div className="space-y-3">
            {offers.map((offer) => {
              const validityMins = validityCountdowns[offer.priceId] ?? getOfferDetails(offer).validityMins;
              return (
                <div key={offer.priceId} className="p-4 bg-ops-bg rounded border border-border space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-text-secondary">Price ID: {offer.priceId.substring(0, 8)}...</p>
                      <p className="text-2xl font-bold text-text-primary mt-2">₹{offer.price}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="blue">v{offer.rateCardVersion}</Badge>
                      <div className="text-xs text-text-secondary">
                        <p>Quoted: {new Date(offer.quotedAt).toLocaleString()}</p>
                        <p className={validityMins > 5 ? "text-green-400" : "text-amber-400"}>
                          Valid: {validityMins}m remaining
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-primary pt-2 border-t border-border">
                    <p>
                      <span className="text-text-secondary">Basis:</span> {offer.basis}
                    </p>
                    <p>
                      <span className="text-text-secondary">Free Cancel:</span> {offer.freeCancellationHours}h
                    </p>
                    <p>
                      <span className="text-text-secondary">Min Lead Time:</span> {offer.minLeadTimeHours}h
                    </p>
                    <p>
                      <span className="text-text-secondary">Currency:</span> {offer.currency}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {offers.length === 0 && (
        <Card padding="lg" className="text-center text-text-secondary py-8">
          <p>No offers yet. Select parameters and click "Get Offers" to generate a quote.</p>
        </Card>
      )}
    </div>
  );
};

QuoteSimulatorTab.displayName = "QuoteSimulatorTab";
