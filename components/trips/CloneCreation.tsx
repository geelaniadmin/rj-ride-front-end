"use client";

import React, { useState, useMemo } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@ride/shared";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { getOffers } from "@/lib/quote";
import { createTripVehicle } from "@/lib/tripHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { TripRequest } from "@/lib/types";

interface CloneCreationProps {
  onCreated?: () => void;
}

export const CloneCreation: React.FC<CloneCreationProps> = ({ onCreated }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId), [allTrips, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);

  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [clonedCustomerId, setClonedCustomerId] = useState<string>("");
  const [clonedDate, setClonedDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [isCommitting, setIsCommitting] = useState(false);

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const clonedCustomer = customers.find((c) => c.id === clonedCustomerId);

  const handleClone = async () => {
    if (!selectedTrip) {
      addToast("Please select a trip to clone", "error");
      return;
    }

    if (!clonedCustomerId) {
      addToast("Please select a customer", "error");
      return;
    }

    setIsCommitting(true);

    try {
      // Re-quote all vehicles for the new customer and date
      const clonedVehicles = await Promise.all(
        selectedTrip.vehicles.map(async (vehicle) => {
          const newVehicle = createTripVehicle(vehicle.requestedVehicleTypeId);
          const offers = getOffers({
            tenantId: activeTenantId,
            vendorId: "V1",
            customerId: clonedCustomerId!,
            vehicleTypeId: vehicle.requestedVehicleTypeId,
            quotedAt: clonedDate!,
            currency: "INR",
            distance: 10,
          });

          return {
            ...newVehicle,
            pax: vehicle.pax, // Preserve pax from original
            priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
            lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
            lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
          };
        })
      );

      const tripId = addTrip({
        tenantId: activeTenantId,
        customerId: clonedCustomerId!,
        createdVia: "CLONE",
        stops: selectedTrip.stops,
        vehicles: clonedVehicles,
        schedule: { type: "ONE_OFF", when: `${clonedDate!}T08:00:00Z` },
        status: "DRAFT",
        autoAssign: false,
        reference: `CLONE-${selectedTrip.id.substring(0, 8)}`,
      });

      addToast(`Cloned trip from ${selectedTrip.id.substring(0, 8)}: ${tripId}`, "success");
      onCreated?.();
    } catch (err) {
      addToast(`Error cloning trip: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Select Source Trip */}
      <Card padding="lg" header={<h3 className="font-semibold">Select Trip to Clone</h3>}>
        <div className="space-y-4">
          {trips.length === 0 ? (
            <p className="text-xs text-text-secondary">No trips available to clone</p>
          ) : (
            <FormField label="Source Trip" required>
              <Select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                options={trips.map((t) => {
                  const customer = customers.find((c) => c.id === t.customerId);
                  return {
                    value: t.id,
                    label: `${t.id.substring(0, 8)} — ${customer?.name || "Unknown"} (${t.vehicles.length}v)`,
                  };
                })}
              />
            </FormField>
          )}
        </div>
      </Card>

      {/* Source Trip Details */}
      {selectedTrip && (
        <Card padding="lg" header={<h3 className="font-semibold">Source Trip Details</h3>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary">Trip ID</p>
                <p className="text-text-primary font-mono text-xs">{selectedTrip.id.substring(0, 12)}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Status</p>
                <p className="text-text-primary">{selectedTrip.status}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Vehicles</p>
                <p className="text-text-primary">{selectedTrip.vehicles.length} vehicle(s)</p>
              </div>
              <div>
                <p className="text-text-tertiary">Stops</p>
                <p className="text-text-primary">{selectedTrip.stops.length} stop(s)</p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-text-primary mb-2">Stops:</p>
              <div className="space-y-1">
                {selectedTrip.stops.map((stop) => (
                  <div key={stop.seq} className="text-xs text-text-primary">
                    <Badge variant={stop.type === "PICKUP" ? "green" : "blue"}>{stop.type}</Badge>
                    <span className="ml-2">{stop.address}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-text-primary mb-2">Vehicles:</p>
              <div className="space-y-1">
                {selectedTrip.vehicles.map((v, idx) => (
                  <div key={v.id} className="text-xs text-text-primary">
                    Vehicle {idx + 1}: {v.pax.length} pax {v.lockedPrice && <span>@ ₹{v.lockedPrice}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Clone Configuration */}
      {selectedTrip && (
        <Card padding="lg" header={<h3 className="font-semibold">Clone Configuration</h3>}>
          <div className="space-y-4">
            <FormField label="New Customer" required>
              <Select
                value={clonedCustomerId}
                onChange={(e) => setClonedCustomerId(e.target.value)}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </FormField>

            <FormField label="New Schedule Date" required>
              <Input type="date" value={clonedDate} onChange={(e) => setClonedDate(e.target.value)} />
            </FormField>

            {clonedCustomer && (
              <div className="p-3 bg-ops-bg rounded border border-border text-xs">
                <p className="text-text-primary">
                  <span className="font-medium">New trip will:</span>
                </p>
                <ul className="mt-2 list-disc list-inside text-text-secondary space-y-1">
                  <li>Use same {selectedTrip.stops.length} stops</li>
                  <li>Create {selectedTrip.vehicles.length} vehicle(s) with new quotes for {clonedCustomer.name}</li>
                  <li>Preserve pax assignments from original trip</li>
                  <li>Be created as DRAFT status</li>
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={handleClone} variant="primary" loading={isCommitting} disabled={!selectedTrip || !clonedCustomerId}>
          Clone Trip
        </Button>
      </div>
    </div>
  );
};

CloneCreation.displayName = "CloneCreation";
