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
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface ApiPaxCreationProps {
  onCreated?: () => void;
}

interface PaxPayload {
  customer_code: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_address: string;
  drop_lat: number;
  drop_lng: number;
  schedule_date: string;
  pax: Array<{
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    employeeId?: string;
    pnr?: string;
  }>;
  vehicle_type?: string;
  reference?: string;
  coordinator?: { name?: string; phone?: string };
  viewers?: string[];
  costCenter?: string;
  pos?: string;
}

const SAMPLE_PAYLOAD: PaxPayload = {
  customer_code: "C1",
  pickup_address: "Hubballi Airport, Terminal 1",
  pickup_lat: 15.333,
  pickup_lng: 75.0,
  drop_address: "Hotel Taj, MG Road, Bangalore",
  drop_lat: 12.9716,
  drop_lng: 77.595,
  schedule_date: "2026-06-15",
  pax: [
    { id: "PAX001", name: "John Doe", phone: "9876543210", email: "john@airline.com", employeeId: "EMP001", pnr: "AA12345" },
    { id: "PAX002", name: "Jane Smith", phone: "9876543211", email: "jane@airline.com", employeeId: "EMP002", pnr: "AA12346" },
    { id: "PAX003", name: "Bob Johnson", phone: "9876543212", email: "bob@airline.com", employeeId: "EMP003", pnr: "AA12347" },
  ],
  vehicle_type: "Sedan",
  reference: "RISMA-FL123-20260615",
  coordinator: { name: "Airline Ops", phone: "+91-9876543000" },
  viewers: ["dispatch@airline.com", "ops@airline.com"],
  costCenter: "DEPT-AIR-001",
  pos: "RISMA_API",
};

export const ApiPaxCreation: React.FC<ApiPaxCreationProps> = ({ onCreated }) => {
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
      return JSON.parse(payload) as PaxPayload;
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
    if (!Array.isArray(parsed.pax) || parsed.pax.length === 0) return "pax array is required and must have at least one passenger";
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

      // Auto-group pax into vehicles: 4 pax per vehicle (sedan capacity)
      const paxPerVehicle = 4;
      const vehicleCount = Math.ceil(parsed.pax.length / paxPerVehicle);

      const vehicles = [];
      for (let i = 0; i < vehicleCount; i++) {
        const startIdx = i * paxPerVehicle;
        const endIdx = Math.min(startIdx + paxPerVehicle, parsed.pax.length);
        const vehiclePax = parsed.pax.slice(startIdx, endIdx);

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
          pax: vehiclePax,
          priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
          lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
          lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
        });
      }

      const tripId = addTrip({
        tenantId: activeTenantId,
        customerId: customer.id,
        createdVia: "API_PAX",
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
        autoAssign: false,
        reference: parsed.reference,
        coordinator: (parsed.coordinator?.name || parsed.coordinator?.phone) ? parsed.coordinator : undefined,
        viewers: parsed.viewers && parsed.viewers.length > 0 ? parsed.viewers : undefined,
        costCenter: parsed.costCenter || undefined,
        pos: parsed.pos || undefined,
      });

      addToast(`Trip created from ${parsed.pax.length} pax in ${vehicleCount} vehicle(s): ${tripId}`, "success");
      onCreated?.();
    } catch (err) {
      addToast(`Error creating trip: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setIsCommitting(false);
    }
  };

  const paxCount = parsed?.pax?.length || 0;
  const vehicleCount = paxCount > 0 ? Math.ceil(paxCount / 4) : 0;

  return (
    <div className="space-y-6">
      <Card padding="lg" header={<h3 className="font-semibold">API Payload (Pax-based)</h3>}>
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Paste a JSON payload from RISMA (passenger IRROPS) or ROMA (email parsing). System auto-groups passengers into vehicles by seating capacity.
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
                <p className="text-text-secondary">Passengers</p>
                <p className="text-text-primary font-medium">{paxCount} pax</p>
              </div>
              <div>
                <p className="text-text-secondary">Vehicles Required</p>
                <p className="text-text-primary font-medium">{vehicleCount}x {parsed.vehicle_type || "Sedan"}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-text-primary mb-3">Passengers:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {parsed.pax.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between bg-ops-bg p-2 rounded text-xs">
                    <span className="text-text-primary">{p.name || `Passenger ${idx + 1}`}</span>
                    <Badge variant="blue">Vehicle {Math.floor(idx / 4) + 1}</Badge>
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
        <Button onClick={handleCreate} variant="primary" loading={isCommitting} disabled={!parsed || paxCount === 0}>
          Create Trip from {paxCount} Pax
        </Button>
      </div>
    </div>
  );
};

ApiPaxCreation.displayName = "ApiPaxCreation";
