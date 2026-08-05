"use client";

import React, { useState, useMemo } from "react";
import { TripVehicle } from "@/lib/types";
import { getOffers, getOfferDetails } from "@/lib/quote";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RefreshCw, Clock } from "lucide-react";

interface OfferReQuoteProps {
  tripId: string;
  customerId: string;
  tenantId: string;
  vehicles: TripVehicle[];
  quotedAt: string;
  onReQuote?: (vehicleIndex: number, newPrice: number, newPriceId: string, newVersion: number) => void;
}

export const OfferReQuote: React.FC<OfferReQuoteProps> = ({ tripId, customerId, tenantId, vehicles, quotedAt, onReQuote }) => {
  const addToast = useToastStore((s) => s.addToast);
  const [reQuotingVehicles, setReQuotingVehicles] = useState<Set<number>>(new Set());

  const expiredVehicles = useMemo(() => {
    return vehicles
      .map((vehicle, idx) => {
        if (!vehicle.priceId) return null;
        // Check if offer is older than 15 minutes
        // For now, we'll mark as expired if it was created more than 15 min ago
        const createdTime = new Date(quotedAt).getTime();
        const now = new Date().getTime();
        const isExpired = (now - createdTime) > 15 * 60 * 1000;
        return isExpired ? idx : null;
      })
      .filter((idx) => idx !== null) as number[];
  }, [vehicles, quotedAt]);

  const handleReQuote = async (vehicleIndex: number) => {
    const vehicle = vehicles[vehicleIndex];
    if (!vehicle) return;

    setReQuotingVehicles((prev) => new Set([...prev, vehicleIndex]));

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newOffers = getOffers({
        tenantId,
        vendorId: "V1",
        customerId,
        vehicleTypeId: vehicle.requestedVehicleTypeId,
        quotedAt,
        currency: "INR",
        distance: 10,
      });

      if (newOffers.length === 0) {
        addToast("No quotes available for this vehicle", "error");
        return;
      }

      const newOffer = newOffers[0]!;
      const { priceLabel } = getOfferDetails(newOffer);

      onReQuote?.(vehicleIndex, newOffer.price, newOffer.priceId, newOffer.rateCardVersion);

      addToast(`Vehicle ${vehicleIndex + 1} re-quoted: ${priceLabel} (v${newOffer.rateCardVersion})`, "success");
    } catch (err) {
      addToast(`Error re-quoting: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setReQuotingVehicles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(vehicleIndex);
        return newSet;
      });
    }
  };

  if (expiredVehicles.length === 0) {
    return null;
  }

  return (
    <Card padding="lg" header={<h3 className="font-semibold flex items-center gap-2">🔄 Re-Quote Expired Offers ({expiredVehicles.length})</h3>}>
      <div className="space-y-2">
        <p className="text-xs text-text-secondary">
          <Clock className="w-3 h-3 inline mr-1" />
          Offers older than 15 minutes. Re-quote to get current prices before confirming.
        </p>
        <div className="space-y-2 pt-2">
          {expiredVehicles.map((vehicleIdx) => {
            const vehicle = vehicles[vehicleIdx]!;
            const isReQuoting = reQuotingVehicles.has(vehicleIdx);

            return (
              <div key={vehicleIdx} className="flex items-center justify-between bg-ops-bg p-3 rounded border border-orange-700/40">
                <div>
                  <p className="text-sm font-medium text-text-primary">Vehicle {vehicleIdx + 1}</p>
                  <p className="text-xs text-orange-300">Price expired — last quoted {Math.floor((Date.now() - new Date(quotedAt).getTime()) / 60000)} minutes ago</p>
                  {vehicle.lockedPrice && <p className="text-xs text-text-secondary mt-1">Current: ₹{vehicle.lockedPrice} (v{vehicle.lockedRateCardVersion})</p>}
                </div>
                <Button size="sm" onClick={() => handleReQuote(vehicleIdx)} loading={isReQuoting} variant="secondary">
                  <RefreshCw className="w-3 h-3 mr-1" /> Re-Quote
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

OfferReQuote.displayName = "OfferReQuote";
