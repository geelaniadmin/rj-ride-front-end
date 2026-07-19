"use client";

import React, { useState, useMemo } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useToastStore } from "@/stores/toastStore";
import { getOffers } from "@/lib/quote";
import { createTripVehicle } from "@/lib/tripHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ApiVehicleCountCreationProps {
  onCreated?: () => void;
}

interface VehicleCountPayload {
  customer_code: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_address: string;
  drop_lat: number;
  drop_lng: number;
  schedule_date: string;
  vehicle_count: number;
  vehicle_type?: string;
  auto_assign?: boolean;
  reference?: string;
  coordinator?: { name?: string; phone?: string };
  viewers?: string[];
  costCenter?: string;
  pos?: string;
}

const SAMPLE_PAYLOAD: VehicleCountPayload = {
  customer_code: "C3",
  pickup_address: "Kanteerava Indoor Stadium, Bangalore",
  pickup_lat: 12.9716,
  pickup_lng: 77.595,
  drop_address: "Bengaluru International Airport, Bangalore",
  drop_lat: 13.1939,
  drop_lng: 77.7064,
  schedule_date: "2026-06-20",
  vehicle_count: 3,
  vehicle_type: "SUV",
  auto_assign: true,
  reference: "CLASS-EVT456-20260620",
  coordinator: { name: "Event Coordinator", phone: "+91-9876543111" },
  costCenter: "EVENT-MKTG-2026",
  pos: "EVENT_API",
};

export const ApiVehicleCountCreation: React.FC<ApiVehicleCountCreationProps> = ({ onCreated }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);

  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  const [payload, setPayload] = useState<string>(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [isCommitting, setIsCommitting] = useState(false);

  // Derived values — computed during render, never call setState here
  const parsed = useMemo(() => {
    try {
      return JSON.parse(payload) as VehicleCountPayload;
    } catch {
      return null;
    }
  }, [payload]);

  const validationError = useMemo(() => {
    if (!parsed) return "Invalid JSON format";
    if (!parsed.customer_code) return "customer_code is required";
    if (!parsed.pickup_address || parsed.pickup_lat === undefined || parsed.pickup_lng === undefined) return "Pickup location is required";
    if (!parsed.drop_address || parsed.drop_lat === undefined || parsed.drop_lng === undefined) return "Drop location is required";
    if (!parsed.schedule_date) return "schedule_date is required";
    if (!parsed.vehicle_count || parsed.vehicle_count < 1) return "vehicle_count is required and must be >= 1";
    return null;
  }, [parsed]);

  const handleCreate = async () => {
    if (!parsed || validationError) return;

    setIsCommitting(true);

    try {
      const customer = customers.find((c) => c.code === parsed.customer_code);
      if (!customer) {
        addToast(`Customer code "${parsed.customer_code}" not found`, "error");
        setIsCommitting(false);
        return;
      }

      const vehicleTypeName = parsed.vehicle_type || "Sedan";
      const vt = vts.find((v) => v.name.toLowerCase() === vehicleTypeName.toLowerCase());
      if (!vt) {
        addToast(`Vehicle type "${vehicleTypeName}" not found`, "error");
        setIsCommitting(false);
        return;
      }

      const vehicles = [];
      for (let i = 0; i < parsed.vehicle_count; i++) {
        const vehicle = createTripVehicle(vt.id);
        const offers = getOffers({
          tenantId: activeTenantId,
          vendorId: "V1",
          customerId: customer.id,
          vehicleTypeId: vt.id,
          quotedAt: parsed.schedule_date,
          currency: "INR",
          distance: 10,
        });

        vehicles.push({
          ...vehicle,
          priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
          lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
          lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
        });
      }

      const tripId = addTrip({
        tenantId: activeTenantId,
        customerId: customer.id,
        createdVia: "API_VEHICLE_COUNT",
        stops: [
          {
            seq: 0,
            type: "PICKUP",
            locationType: "ADDRESS",
            address: parsed.pickup_address,
            lat: parsed.pickup_lat,
            lng: parsed.pickup_lng,
          },
          {
            seq: 1,
            type: "DROP",
            locationType: "ADDRESS",
            address: parsed.drop_address,
            lat: parsed.drop_lat,
            lng: parsed.drop_lng,
          },
        ],
        vehicles,
        schedule: { type: "ONE_OFF", when: `${parsed.schedule_date}T08:00:00Z` },
        status: "DRAFT",
        autoAssign: parsed.auto_assign ?? false,
        reference: parsed.reference,
        coordinator: (parsed.coordinator?.name || parsed.coordinator?.phone) ? parsed.coordinator : undefined,
        viewers: parsed.viewers && parsed.viewers.length > 0 ? parsed.viewers : undefined,
        costCenter: parsed.costCenter || undefined,
        pos: parsed.pos || undefined,
      });

      addToast(`Trip created with ${parsed.vehicle_count} vehicle slots: ${tripId}`, "success");
      onCreated?.();
    } catch (err) {
      addToast(`Error creating trip: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setIsCommitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card padding="lg" header={<h3 className="font-semibold">API Payload (Vehicle Count)</h3>}>
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Paste a JSON payload with vehicle count. System creates empty vehicle slots for manual pax assignment or auto-assignment.
          </p>

          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="w-full h-64 px-3 py-2 bg-ops-bg border border-border rounded font-mono text-xs text-text-primary"
            placeholder="Paste JSON payload here..."
          />

          {validationError && (
            <div className="p-3 bg-red-900/20 border border-red-700/40 rounded">
              <p className="text-xs text-red-300">{validationError}</p>
            </div>
          )}
        </div>
      </Card>

      {parsed && (
        <Card padding="lg" header={<h3 className="font-semibold">Preview</h3>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Customer</p>
                <p className="text-text-primary font-medium">{customers.find((c) => c.code === parsed.customer_code)?.name}</p>
              </div>
              <div>
                <p className="text-text-secondary">Schedule Date</p>
                <p className="text-text-primary font-medium">{parsed.schedule_date}</p>
              </div>
              <div>
                <p className="text-text-secondary">Vehicle Slots</p>
                <p className="text-text-primary font-medium">{parsed.vehicle_count}x {parsed.vehicle_type || "Sedan"}</p>
              </div>
              <div>
                <p className="text-text-secondary">Auto-assign</p>
                <p className="text-text-primary font-medium">{parsed.auto_assign ? "Enabled" : "Disabled"}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-text-primary mb-3">Vehicle Slots:</p>
              <div className="space-y-2">
                {Array.from({ length: parsed.vehicle_count }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-ops-bg p-2 rounded text-xs">
                    <span className="text-text-primary">Vehicle {idx + 1}</span>
                    <Badge variant="amber">Empty</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setPayload(JSON.stringify(SAMPLE_PAYLOAD, null, 2))} variant="secondary">
          Reset to Sample
        </Button>
        <Button onClick={handleCreate} variant="primary" loading={isCommitting} disabled={!parsed || (parsed?.vehicle_count || 0) === 0}>
          Create Trip with {parsed?.vehicle_count || 0} Vehicle Slots
        </Button>
      </div>
    </div>
  );
};

ApiVehicleCountCreation.displayName = "ApiVehicleCountCreation";
