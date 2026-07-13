"use client";

import React, { useState, useMemo } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@ride/shared";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { usePassengerStore } from "@/stores/passengerStore";
import { autoAssignTrip } from "@/lib/dispatchEngine";
import { getOffers } from "@/lib/quote";
import { createTripVehicle, calculateReverseScheduleTime } from "@/lib/tripHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { StopEditor } from "@/components/trips/StopEditor";
import { PaxAssignment } from "@/components/trips/PaxAssignment";
import { TripMetadata } from "@/components/trips/TripMetadata";
import { Stop, TripVehicle, Offer, Pax } from "@/lib/types";import {
  Clock,
  User
} from "lucide-react";

interface ManualTripCreationProps {
  onCreated?: () => void;
}

export const ManualTripCreation: React.FC<ManualTripCreationProps> = ({ onCreated }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => {
    const tenantCustomers = allCustomers.filter((c) => c.tenantId === activeTenantId);
    // Deduplicate by name — the same customer name may appear with different IDs
    // (e.g., from cross-tab sync with ops portal which uses addCustomer with random UUIDs)
    const seen = new Set<string>();
    return tenantCustomers.filter((c) => {
      const key = c.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allCustomers, activeTenantId]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => {
    const tenantVTs = allVTs.filter((v) => v.tenantId === activeTenantId);
    // Deduplicate by ID
    const seen = new Set<string>();
    return tenantVTs.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [allVTs, activeTenantId]);
  const allVendors = useVendorStore((s) => s.vendors);
  const vendors = useMemo(() => allVendors.filter((v) => v.tenantId === activeTenantId && v.active), [allVendors, activeTenantId]);

  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  // ── Logged-in passenger ──
  const loggedInPax = usePassengerStore((s) => s.pax);

  const [customerId, setCustomerId] = useState<string>(((customers && customers[0] ? customers[0].id : "") as string) || "");
  const [vendorId, setVendorId] = useState<string>(((vendors && vendors[0] ? vendors[0].id : "") as string) || "");
  const [scheduleType, setScheduleType] = useState<"ONE_OFF" | "RECURRING">("ONE_OFF");
  const [scheduleDate, setScheduleDate] = useState<string>((new Date().toISOString().split("T")[0] || "") as string);
  const [reference, setReference] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicles, setVehicles] = useState<TripVehicle[]>([]);
  const [vehicleOffers, setVehicleOffers] = useState<Record<string, Offer[]>>({});
  const [selectedOffers, setSelectedOffers] = useState<Record<string, string>>({});
  const [newVehicleTypeId, setNewVehicleTypeId] = useState<string>(((vts && vts[0] ? vts[0].id : "") as string) || "");
  const [autoAssign, setAutoAssign] = useState(false);
  const [metadata, setMetadata] = useState<{ coordinator: { name?: string; phone?: string }; viewers: string[]; costCenter: string; pos: string }>({
    coordinator: {},
    viewers: [],
    costCenter: "",
    pos: "",
  });

  const addStop = () => {
    const newStop: Stop = {
      seq: stops.length,
      type: stops.length === 0 ? "PICKUP" : "DROP",
      locationType: "ADDRESS",
      address: "",
      lat: 0,
      lng: 0,
    };
    setStops([...stops, newStop]);
  };

  const updateStop = (index: number, updates: Partial<Stop>) => {
    setStops(stops.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const suggestReverseSchedule = () => {
    // Find the last stop (drop-off)
    const dropStop = stops[stops.length - 1];
    if (!dropStop || !dropStop.plannedTime) {
      addToast("Set planned arrival time for the drop-off stop first", "info");
      return;
    }

    // Assume average travel time 20 minutes + 60 min buffer
    const suggestedTime = calculateReverseScheduleTime(dropStop.plannedTime, 20, 60);
    const suggestedDate = suggestedTime.split("T")[0];
    const suggestedTimeOnly = suggestedTime.split("T")[1]?.substring(0, 5);

    if (suggestedDate) {
      setScheduleDate(suggestedDate);
      addToast(`Suggested dispatch: ${suggestedDate} at ${suggestedTimeOnly}`, "info");
    }
  };

  const addVehicle = () => {
    const vId = vendorId || "V1";
    const newVehicle = createTripVehicle(newVehicleTypeId, vId);
    setVehicles([...vehicles, newVehicle]);
    // Auto-quote the new vehicle
    const offers = getOffers({
      tenantId: activeTenantId,
      vendorId: vId,
      customerId,
      vehicleTypeId: newVehicleTypeId,
      quotedAt: scheduleDate,
      currency: "INR",
      distance: 10,
    });
    if (offers.length > 0 && offers[0]) {
      setVehicleOffers((prev) => ({ ...prev, [newVehicle.id]: offers }));
      setSelectedOffers((prev) => ({ ...prev, [newVehicle.id]: offers[0]!.priceId }));
    }
  };

  const removeVehicle = (index: number) => {
    const vehicle = vehicles[index];
    if (!vehicle) return;
    const vehicleId = vehicle.id;
    setVehicles(vehicles.filter((_, i) => i !== index));
    const newOffers = { ...vehicleOffers };
    const newSelected = { ...selectedOffers };
    delete newOffers[vehicleId];
    delete newSelected[vehicleId];
    setVehicleOffers(newOffers);
    setSelectedOffers(newSelected);
  };

  const updateVehiclePax = (vehicleIndex: number, pax: Pax[]) => {
    setVehicles(vehicles.map((v, i) => (i === vehicleIndex ? { ...v, pax } : v)));
  };

  const handleCreateTrip = () => {
    if (!customerId) {
      addToast("Please select a customer", "error");
      return;
    }
    if (stops.length < 2) {
      addToast("Please add at least pickup and drop stops", "error");
      return;
    }
    if (vehicles.length === 0) {
      addToast("Please add at least one vehicle", "error");
      return;
    }

    // Build vehicles with offers
    const vehiclesWithOffers: TripVehicle[] = vehicles.map((v) => {
      const selectedOfferId = selectedOffers[v.id];
      const offers = vehicleOffers[v.id] || [];
      const selectedOffer = offers.find((o) => o.priceId === selectedOfferId);

      if (!selectedOffer) {
        throw new Error(`Vehicle ${v.id} missing selected offer`);
      }

      // Auto-add logged-in passenger as pax on first vehicle
      let pax = v.pax;
      if (loggedInPax && !pax.some((p) => p.id === loggedInPax.id)) {
        const newPax = {
          id: loggedInPax.id,
          name: loggedInPax.name,
          phone: loggedInPax.phone,
        };
        pax = [...pax, newPax];
      }

      return {
        ...v,
        pax,
        priceId: selectedOffer.priceId,
        lockedPrice: selectedOffer.price,
        lockedRateCardVersion: selectedOffer.rateCardVersion,
      };
    });

    try {
      const tripId = addTrip({
        tenantId: activeTenantId,
        customerId,
        createdVia: "MANUAL",
        stops,
        vehicles: vehiclesWithOffers,
        schedule:
          scheduleType === "ONE_OFF"
            ? { type: "ONE_OFF", when: `${scheduleDate}T08:00:00Z` }
            : { type: "RECURRING", rule: { freq: "DAILY", startDate: (scheduleDate as string), time: "08:00" } },
        status: "DRAFT",
        autoAssign,
        reference: reference || undefined,
        coordinator: (metadata.coordinator.name || metadata.coordinator.phone) ? metadata.coordinator : undefined,
        viewers: metadata.viewers.length > 0 ? metadata.viewers : undefined,
        costCenter: metadata.costCenter || undefined,
        pos: metadata.pos || undefined,
      });

      addToast(`Trip created: ${tripId}`, "success");

      // Auto-dispatch if enabled
      if (autoAssign && activeTenantId) {
        const assignResult = autoAssignTrip(activeTenantId, tripId);
        if (assignResult.assignments.length > 0) {
          addToast(`Auto-assigned ${assignResult.assignments.length} vehicle(s)`, "success");
        }
        if (assignResult.failed.length > 0) {
          addToast(`${assignResult.failed.length} vehicle(s) could not be auto-assigned`, "info");
        }
      }

      onCreated?.();
    } catch (err) {
      addToast(`Error creating trip: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  return (
    <div className="space-y-6 h-full">
      {/* Customer & Schedule */}
      <Card padding="lg" header={<h3 className="font-semibold">Trip Details</h3>}>
        <div className="space-y-4">
          <FormField label="Customer" required>
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label="Vehicle Vendor" required>
            <Select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label="Reference (optional)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., BOOK-12345, PO-789" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Schedule Type">
              <Select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as "ONE_OFF" | "RECURRING")}
                options={[
                  { value: "ONE_OFF", label: "One-off" },
                  { value: "RECURRING", label: "Recurring" },
                ]}
              />
            </FormField>

            <FormField label="Date">
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </FormField>
          </div>
        </div>
      </Card>

      {/* Stops with Location Typing */}
      <Card padding="lg" header={<div className="flex justify-between items-center"><h3 className="font-semibold">Stops ({stops.length})</h3><div className="flex gap-2"><Button size="sm" onClick={suggestReverseSchedule}><Clock className="w-3 h-3 mr-1" /> Suggest Time</Button><Button size="sm" onClick={addStop}>Add Stop</Button></div></div>}>
        <div className="space-y-3">
          {stops.map((stop, idx) => (
            <StopEditor key={idx} stop={stop} index={idx} onUpdate={updateStop} onRemove={removeStop} />
          ))}
        </div>
      </Card>

      {/* Vehicles & Pricing */}
      <Card padding="lg" header={<div className="flex justify-between items-center"><h3 className="font-semibold">Vehicles ({vehicles.length})</h3><Button size="sm" onClick={addVehicle}>Add Vehicle</Button></div>}>
        <div className="space-y-3 mb-4">
          {vehicles.map((vehicle, idx) => {
            const offers = vehicleOffers[vehicle.id] || [];
            const selectedOfferId = selectedOffers[vehicle.id];
            const selectedOffer = offers.find((o) => o.priceId === selectedOfferId);

            return (
              <div key={vehicle.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Vehicle {idx + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeVehicle(idx)}>
                    Remove
                  </Button>
                </div>

                {offers.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-text-secondary">Select offer:</p>
                    <select
                      value={selectedOfferId || ""}
                      onChange={(e) => setSelectedOffers((prev) => ({ ...prev, [vehicle.id]: e.target.value }))}
                      className="w-full px-2 py-1 bg-ops-bg border border-border rounded text-xs text-text-primary"
                    >
                      {offers.map((o) => (
                        <option key={o.priceId} value={o.priceId}>
                          ₹{o.price} (v{o.rateCardVersion})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="text-red-400 font-medium">No offers available</p>
                    <p className="text-text-muted mt-1">
                      Go to <span className="text-brand-blue">Pricing → Rate Cards</span> to create a rate card for this vendor + customer + vehicle type.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loggedInPax && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-lg mb-3">
            <User className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span className="text-xs text-text-primary">
              Passenger: <span className="font-medium">{loggedInPax.name}</span>
            </span>
            <span className="text-[10px] text-text-secondary ml-auto">
              Will be auto-added to the first vehicle
            </span>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-xs text-text-secondary mb-2">Add vehicle type:</p>
          <div className="flex gap-2">
            <Select
              value={newVehicleTypeId}
              onChange={(e) => setNewVehicleTypeId(e.target.value)}
              options={vts.map((v) => ({ value: v.id, label: v.name }))}
            />
          </div>
        </div>
      </Card>

      {/* Pax Assignment */}
      {vehicles.length > 0 && <PaxAssignment vehicles={vehicles} onUpdateVehiclePax={updateVehiclePax} />}

      {/* Trip Metadata */}
      <TripMetadata
        coordinator={metadata.coordinator}
        viewers={metadata.viewers}
        costCenter={metadata.costCenter}
        pos={metadata.pos}
        onUpdate={(updates) => setMetadata((prev) => ({ ...prev, ...updates }))}
      />

      {/* Auto-Assign toggle */}
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-lg">
        <input
          type="checkbox"
          id="aa"
          checked={autoAssign}
          onChange={(e) => setAutoAssign(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        <label htmlFor="aa" className="text-xs font-medium text-text-primary cursor-pointer flex items-center gap-1.5">
          Auto-assign vehicles & drivers via dispatch engine
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 sticky bottom-0 bg-ops-sidebar py-4">
        <Button onClick={handleCreateTrip} variant="primary">
          Create Trip
        </Button>
      </div>
    </div>
  );
};

ManualTripCreation.displayName = "ManualTripCreation";
