"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, formatMoney, isApiError, csrfFetch } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Plus, Minus, ArrowRight, Clock } from "lucide-react";

type Customer = components["schemas"]["Customer"];
type VehicleType = components["schemas"]["VehicleType"];
type Vendor = components["schemas"]["Vendor"];

type QuoteOffer = {
  id: string;
  price_id: string;
  vendor: string;
  rate_card: string;
  rate_card_version: number;
  basis: string;
  price_minor: number;
  currency: string;
  free_cancellation_hours: number;
  min_lead_time_hours: number;
  expires_at: string;
  created_at: string;
};

type Phase = "form" | "booked";

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

interface StopEntry {
  kind: "PICKUP" | "DROP" | "WAYPOINT";
  location_type: "AIRPORT" | "RAIL" | "HOTEL" | "CITY" | "ADDRESS";
  address: string;
  lat: number;
  lng: number;
  planned_time: string;
  flight_number: string;
}

interface SlotEntry {
  vehicle_type_id: string;
  slot_ref: string;
}

const DEFAULT_STOP: StopEntry = {
  kind: "PICKUP",
  location_type: "ADDRESS",
  address: "",
  lat: 0,
  lng: 0,
  planned_time: "",
  flight_number: "",
};

export const ManualTripCreation: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("form");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [reference, setReference] = useState("");
  const [pickupAt, setPickupAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    return d.toISOString().slice(0, 16);
  });
  const [stops, setStops] = useState<StopEntry[]>([
    { ...DEFAULT_STOP, kind: "PICKUP" },
    { ...DEFAULT_STOP, kind: "DROP" },
  ]);
  const [slots, setSlots] = useState<SlotEntry[]>([{ vehicle_type_id: "", slot_ref: "slot-1" }]);
  const [bookedTripId, setBookedTripId] = useState<string | null>(null);

  const { data: customersData } = useQuery({
    queryKey: keys.config.customers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {});
      if (err) throw err;
      return res;
    },
  });

  const { data: vendorsData } = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {});
      if (err) throw err;
      return res;
    },
  });

  const { data: vehicleTypesData } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res;
    },
  });

  const customers = (customersData?.results ?? []) as Customer[];
  const vehicleTypes = (vehicleTypesData?.results ?? []) as VehicleType[];
  const vendors = (vendorsData?.results ?? []) as Vendor[];

  // One-click create: for each vehicle slot, fetch the priced offer for the SELECTED vendor
  // (offers are per vendor×customer×vehicle-type via rate cards), then book citing those
  // offers. Booking routes the slot to that vendor, so it appears in the vendor portal.
  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate on click (button stays enabled) so the reason is never a mystery.
      if (!customerId) throw new Error("Select a customer.");
      if (!vendorId) throw new Error("Select a vendor.");
      if (slots.every((s) => !s.vehicle_type_id)) throw new Error("Select at least one vehicle type.");
      if (stops.some((s) => !s.address.trim())) throw new Error("Enter the pickup and drop address for every stop.");

      const when = pickupAt ? new Date(pickupAt).toISOString() : new Date().toISOString();
      const chosen: { slot: SlotEntry; offer: QuoteOffer }[] = [];

      for (const slot of slots) {
        if (!slot.vehicle_type_id) continue;
        const resp = await csrfFetch("/api/v1/pricing/offers/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: customerId, vehicle_type: slot.vehicle_type_id, when }),
        });
        const envelope = await resp.json() as { result?: QuoteOffer[]; error?: { message?: string } };
        if (!resp.ok) throw new Error(envelope?.error?.message ?? `Pricing failed (${resp.status})`);
        const match = (envelope.result ?? []).find((o) => o.vendor === vendorId);
        if (!match) {
          const vtName = vehicleTypes.find((v) => v.id === slot.vehicle_type_id)?.name ?? "that vehicle type";
          const vName = vendors.find((v) => v.id === vendorId)?.name ?? "the selected vendor";
          throw new Error(`No rate card for ${vName} × ${vtName}. Add one under Pricing & Quotes.`);
        }
        chosen.push({ slot, offer: match });
      }
      if (!chosen.length) throw new Error("Add at least one vehicle type.");

      const resp = await csrfFetch("/api/v1/trips/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": generateIdempotencyKey() },
        body: JSON.stringify({
          customer_id: customerId,
          pickup_at: when,
          reference: reference || undefined,
          stops: stops.map((s, i) => ({
            sequence: i,
            kind: s.kind,
            location_type: s.location_type,
            address: s.address,
            lat: s.lat || undefined,
            lng: s.lng || undefined,
            extra: {
              planned_time: s.planned_time || undefined,
              flight_number: s.flight_number || undefined,
            },
          })),
          vehicles: chosen.map(({ slot, offer }) => ({
            vehicle_type_id: slot.vehicle_type_id,
            offer_id: offer.id,
          })),
        }),
      });
      const envelope = await resp.json() as { result?: { id?: string }; error?: { message?: string } };
      if (!resp.ok) throw new Error(envelope?.error?.message ?? `Create failed (${resp.status})`);
      return envelope.result;
    },
    onSuccess: (trip) => {
      addToast("Trip created", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      setBookedTripId(trip?.id ?? null);
      setPhase("booked");
      onDone?.();
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : err instanceof Error ? err.message : "Create failed", "error");
    },
  });

  const updateStop = (idx: number, field: keyof StopEntry, value: string | number) => {
    setStops((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addStop = () => {
    setStops((prev) => [...prev.slice(0, -1), { ...DEFAULT_STOP, kind: "WAYPOINT" }, prev[prev.length - 1]!]);
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { vehicle_type_id: "", slot_ref: `slot-${prev.length + 1}` }]);
  };

  const removeSlot = (idx: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  if (phase === "booked") {
    return (
      <Card padding="lg" className="text-center space-y-3 py-8">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-text-primary">Trip booked!</p>
        {bookedTripId && (
          <p className="text-xs font-mono text-text-secondary">{bookedTripId}</p>
        )}
        <Button onClick={() => { setPhase("form"); setBookedTripId(null); }}>
          Create another
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <FormField label="Customer">
        <SearchableSelect
          value={customerId}
          onChange={setCustomerId}
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Search customer…"
        />
      </FormField>

      <FormField label="Vendor">
        <SearchableSelect
          value={vendorId}
          onChange={setVendorId}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Search vendor…"
        />
      </FormField>

      <FormField label="Reference (optional)">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO / booking ref" />
      </FormField>

      <FormField label="Pickup Date & Time">
        <Input
          type="datetime-local"
          value={pickupAt}
          onChange={(e) => setPickupAt(e.target.value)}
        />
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Stops</h4>
          <Button size="sm" variant="secondary" onClick={addStop}>
            <Plus className="w-3 h-3 mr-1" /> Waypoint
          </Button>
        </div>

        {stops.map((stop, idx) => (
          <Card key={idx} padding="sm" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                {idx === 0 ? "Pickup" : idx === stops.length - 1 ? "Drop" : `Waypoint ${idx}`}
              </span>
              {idx !== 0 && idx !== stops.length - 1 && (
                <button onClick={() => removeStop(idx)} className="text-danger text-xs">
                  <Minus className="w-3 h-3" />
                </button>
              )}
            </div>
            <Input
              placeholder="Address"
              value={stop.address}
              onChange={(e) => updateStop(idx, "address", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Type</label>
                <select
                  value={stop.location_type}
                  onChange={(e) => updateStop(idx, "location_type", e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-border rounded text-xs text-text-primary"
                >
                  {["ADDRESS", "AIRPORT", "RAIL", "HOTEL", "CITY"].map((lt) => (
                    <option key={lt} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Time (optional)"
                type="datetime-local"
                value={stop.planned_time}
                onChange={(e) => updateStop(idx, "planned_time", e.target.value)}
              />
            </div>
            {stop.location_type === "AIRPORT" && (
              <Input
                placeholder="Flight number"
                value={stop.flight_number}
                onChange={(e) => updateStop(idx, "flight_number", e.target.value)}
              />
            )}
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Vehicle Types</h4>
          <Button size="sm" variant="secondary" onClick={addSlot}>
            <Plus className="w-3 h-3 mr-1" /> Vehicle
          </Button>
        </div>

        {slots.map((slot, idx) => (
          <div key={slot.slot_ref} className="flex items-center gap-2">
            <SearchableSelect
              value={slot.vehicle_type_id}
              onChange={(val) => setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, vehicle_type_id: val } : s))}
              options={vehicleTypes.map((v) => ({ value: v.id, label: v.name }))}
              placeholder="Search vehicle type…"
              className="flex-1"
            />
            {slots.length > 1 && (
              <button onClick={() => removeSlot(idx)} className="text-danger">
                <Minus className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={() => createMutation.mutate()}
        variant="primary"
        className="w-full"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? "Creating…" : "Create"} <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

ManualTripCreation.displayName = "ManualTripCreation";
