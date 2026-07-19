"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, formatMoney, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Plus, Minus, ArrowRight, Clock } from "lucide-react";

type QuoteOffer = components["schemas"]["QuoteOffer"];
type TripStop = components["schemas"]["TripStop"];
type ConfigCustomer = components["schemas"]["ConfigCustomer"];
type ConfigVehicleType = components["schemas"]["ConfigVehicleType"];

type Phase = "form" | "offers" | "booked";

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

interface StopEntry {
  type: "PICKUP" | "DROP" | "WAYPOINT";
  locationType: "AIRPORT" | "RAIL" | "HOTEL" | "CITY" | "ADDRESS";
  address: string;
  lat: number;
  lng: number;
  plannedTime: string;
  flightNumber: string;
}

interface SlotEntry {
  vehicleTypeId: string;
  slotRef: string;
}

const DEFAULT_STOP: StopEntry = {
  type: "PICKUP",
  locationType: "ADDRESS",
  address: "",
  lat: 0,
  lng: 0,
  plannedTime: "",
  flightNumber: "",
};

export const ManualTripCreation: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("form");
  const [customerId, setCustomerId] = useState("");
  const [reference, setReference] = useState("");
  const [stops, setStops] = useState<StopEntry[]>([
    { ...DEFAULT_STOP, type: "PICKUP" },
    { ...DEFAULT_STOP, type: "DROP" },
  ]);
  const [slots, setSlots] = useState<SlotEntry[]>([{ vehicleTypeId: "", slotRef: "slot-1" }]);
  const [offers, setOffers] = useState<QuoteOffer[]>([]);
  const [selectedPriceIds, setSelectedPriceIds] = useState<Record<string, string>>({});
  const [bookedTripId, setBookedTripId] = useState<string | null>(null);
  const [idempotencyKey] = useState(generateIdempotencyKey);

  const { data: customers } = useQuery({
    queryKey: keys.config.customers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const { data: vehicleTypes } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error: err } = await apiClient.POST("/v1/pricing/quote", {
        body: {
          customerId,
          stops: stops.map((s, i) => ({
            seq: i,
            type: s.type,
            locationType: s.locationType,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            plannedTime: s.plannedTime || undefined,
            flightNumber: s.flightNumber || undefined,
          })) as TripStop[],
          vehicleSlots: slots.map((sl) => ({
            vehicleTypeId: sl.vehicleTypeId,
            slotRef: sl.slotRef,
          })),
          quotedAt: new Date().toISOString(),
        },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (result) => {
      if (!result?.offers?.length) {
        addToast("No offers returned — check rate card configuration", "error");
        return;
      }
      setOffers(result.offers);
      const autoSelected: Record<string, string> = {};
      for (const offer of result.offers) {
        autoSelected[offer.slotRef] = offer.priceId;
      }
      setSelectedPriceIds(autoSelected);
      setPhase("offers");
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Quote failed", "error");
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error: err } = await apiClient.POST("/v1/trips", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          customerId,
          stops: stops.map((s, i) => ({
            seq: i,
            type: s.type,
            locationType: s.locationType,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            plannedTime: s.plannedTime || undefined,
            flightNumber: s.flightNumber || undefined,
          })) as TripStop[],
          vehicleSlots: slots.map((sl) => ({
            vehicleTypeId: sl.vehicleTypeId,
            priceId: selectedPriceIds[sl.slotRef] ?? "",
          })),
          schedule: { type: "ONE_OFF" },
          reference: reference || undefined,
        },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (trip) => {
      addToast("Trip booked!", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      setBookedTripId(trip?.id ?? null);
      setPhase("booked");
      onDone?.();
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Booking failed", "error");
    },
  });

  const updateStop = (idx: number, field: keyof StopEntry, value: string | number) => {
    setStops((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addStop = () => {
    setStops((prev) => [...prev.slice(0, -1), { ...DEFAULT_STOP, type: "WAYPOINT" }, prev[prev.length - 1]!]);
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { vehicleTypeId: "", slotRef: `slot-${prev.length + 1}` }]);
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
        <Button onClick={() => { setPhase("form"); setOffers([]); setSelectedPriceIds({}); setBookedTripId(null); }}>
          Create another
        </Button>
      </Card>
    );
  }

  if (phase === "offers") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Select Offers</h3>
        <div className="space-y-3">
          {offers.map((offer) => {
            const isSelected = selectedPriceIds[offer.slotRef] === offer.priceId;
            const expires = new Date(offer.expiresAt);
            const minsLeft = Math.max(0, Math.round((expires.getTime() - Date.now()) / 60000));
            const vtName = vehicleTypes?.find((v: ConfigVehicleType) => v.id === offer.vehicleTypeId)?.name ?? offer.vehicleTypeId;

            return (
              <div
                key={offer.priceId}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPriceIds((prev) => ({ ...prev, [offer.slotRef]: offer.priceId }))}
                onKeyDown={(e) => e.key === "Enter" && setSelectedPriceIds((prev) => ({ ...prev, [offer.slotRef]: offer.priceId }))}
                className={`p-3 rounded border cursor-pointer transition-colors ${isSelected ? "border-brand-blue bg-brand-blue/5" : "border-border hover:border-brand-blue/40"}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-text-secondary">{vtName} — {offer.slotRef}</p>
                    <p className="text-xl font-bold text-text-primary mt-1">
                      {formatMoney(offer.priceMinor, offer.currency)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {offer.basis} · Free cancel: {offer.freeCancellationHours}h
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    {isSelected && <Badge variant="blue">Selected</Badge>}
                    <div className={`text-xs flex items-center gap-1 justify-end ${minsLeft < 5 ? "text-amber-400" : "text-text-secondary"}`}>
                      <Clock className="w-3 h-3" /> {minsLeft}m left
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => setPhase("form")} variant="secondary">Back</Button>
          <Button
            onClick={() => bookMutation.mutate()}
            variant="primary"
            disabled={bookMutation.isPending || Object.keys(selectedPriceIds).length < slots.length}
            className="flex-1"
          >
            {bookMutation.isPending ? "Booking…" : "Book Trip"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormField label="Customer">
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={(customers ?? []).map((c: ConfigCustomer) => ({ value: c.id, label: c.name }))}
        />
      </FormField>

      <FormField label="Reference (optional)">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO / booking ref" />
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
                  value={stop.locationType}
                  onChange={(e) => updateStop(idx, "locationType", e.target.value)}
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
                value={stop.plannedTime}
                onChange={(e) => updateStop(idx, "plannedTime", e.target.value)}
              />
            </div>
            {stop.locationType === "AIRPORT" && (
              <Input
                placeholder="Flight number"
                value={stop.flightNumber}
                onChange={(e) => updateStop(idx, "flightNumber", e.target.value)}
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
          <div key={slot.slotRef} className="flex items-center gap-2">
            <Select
              value={slot.vehicleTypeId}
              onChange={(e) => setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, vehicleTypeId: e.target.value } : s))}
              options={(vehicleTypes ?? []).map((v: ConfigVehicleType) => ({ value: v.id, label: v.name }))}
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
        onClick={() => quoteMutation.mutate()}
        variant="primary"
        className="w-full"
        disabled={!customerId || stops.some((s) => !s.address) || slots.some((s) => !s.vehicleTypeId) || quoteMutation.isPending}
      >
        {quoteMutation.isPending ? "Getting offers…" : "Get Quote"} <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

ManualTripCreation.displayName = "ManualTripCreation";
