"use client";

import React, { useState, useMemo } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@ride/shared";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
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
import { TripMetadata } from "@/components/trips/TripMetadata";

interface RecurringCreationProps {
  onCreated?: () => void;
}

export const RecurringCreation: React.FC<RecurringCreationProps> = ({ onCreated }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);

  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || "");
  const [vehicleTypeId, setVehicleTypeId] = useState<string>(vts[0]?.id || "");
  const [pickupAddress, setPickupAddress] = useState("Corporate Office, MG Road");
  const [pickupLat, setPickupLat] = useState("12.9716");
  const [pickupLng, setPickupLng] = useState("77.595");
  const [dropAddress, setDropAddress] = useState("Airport, Bangalore");
  const [dropLat, setDropLat] = useState("13.1939");
  const [dropLng, setDropLng] = useState("77.7064");

  const [freq, setFreq] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState("08:00");

  const [metadata, setMetadata] = useState<{ coordinator: { name?: string; phone?: string }; viewers: string[]; costCenter: string; pos: string }>({
    coordinator: {},
    viewers: [],
    costCenter: "",
    pos: "",
  });

  const [isCommitting, setIsCommitting] = useState(false);

  const generateDates = (): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate!);
    const end = new Date(endDate!);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (freq === "DAILY") {
        dates.push(d.toISOString().split("T")[0]!);
      } else if (freq === "WEEKLY" && daysOfWeek.includes(d.getDay())) {
        dates.push(d.toISOString().split("T")[0]!);
      }
    }

    return dates;
  };

  const dates = generateDates();

  const handleCreate = async () => {
    if (!customerId || !vehicleTypeId) {
      addToast("Please select customer and vehicle type", "error");
      return;
    }

    if (dates.length === 0) {
      addToast("No dates match the recurrence rule", "error");
      return;
    }

    setIsCommitting(true);

    try {
      let createdCount = 0;
      const errors: string[] = [];

      for (const date of dates) {
        try {
          const vehicle = createTripVehicle(vehicleTypeId);
          const offers = getOffers({
            tenantId: activeTenantId,
            vendorId: "V1",
            customerId,
            vehicleTypeId,
            quotedAt: date,
            currency: "INR",
            distance: 10,
          });

          const tripVehicle = {
            ...vehicle,
            priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
            lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
            lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
          };

          const tripId = addTrip({
            tenantId: activeTenantId,
            customerId,
            createdVia: "RECURRING",
            stops: [
              {
                seq: 0,
                type: "PICKUP",
                locationType: "ADDRESS",
                address: pickupAddress,
                lat: parseFloat(pickupLat),
                lng: parseFloat(pickupLng),
              },
              {
                seq: 1,
                type: "DROP",
                locationType: "ADDRESS",
                address: dropAddress,
                lat: parseFloat(dropLat),
                lng: parseFloat(dropLng),
              },
            ],
            vehicles: [tripVehicle],
            schedule: { type: "ONE_OFF", when: `${date}T${scheduleTime}:00Z` },
            status: "DRAFT",
            autoAssign: false,
            coordinator: (metadata.coordinator.name || metadata.coordinator.phone) ? metadata.coordinator : undefined,
            viewers: metadata.viewers.length > 0 ? metadata.viewers : undefined,
            costCenter: metadata.costCenter || undefined,
            pos: metadata.pos || undefined,
          });

          createdCount++;
        } catch (err) {
          errors.push(`${date}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (createdCount > 0) {
        addToast(`Created ${createdCount} recurring trips`, "success");
      }
      if (errors.length > 0) {
        addToast(`${errors.length} trips failed`, "error");
      }

      if (createdCount > 0) {
        onCreated?.();
      }
    } finally {
      setIsCommitting(false);
    }
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Base Trip Details */}
      <Card padding="lg" header={<h3 className="font-semibold">Base Trip Details</h3>}>
        <div className="space-y-4">
          <FormField label="Customer" required>
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label="Vehicle Type" required>
            <Select
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              options={vts.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label="Pickup Address">
            <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude">
              <Input type="number" step="0.0001" value={pickupLat} onChange={(e) => setPickupLat(e.target.value)} />
            </FormField>
            <FormField label="Longitude">
              <Input type="number" step="0.0001" value={pickupLng} onChange={(e) => setPickupLng(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Drop Address">
            <Input value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude">
              <Input type="number" step="0.0001" value={dropLat} onChange={(e) => setDropLat(e.target.value)} />
            </FormField>
            <FormField label="Longitude">
              <Input type="number" step="0.0001" value={dropLng} onChange={(e) => setDropLng(e.target.value)} />
            </FormField>
          </div>
        </div>
      </Card>

      {/* Recurrence Rule */}
      <Card padding="lg" header={<h3 className="font-semibold">Recurrence Rule</h3>}>
        <div className="space-y-4">
          <FormField label="Frequency">
            <Select
              value={freq}
              onChange={(e) => setFreq(e.target.value as "DAILY" | "WEEKLY")}
              options={[
                { value: "DAILY", label: "Daily" },
                { value: "WEEKLY", label: "Weekly" },
              ]}
            />
          </FormField>

          {freq === "WEEKLY" && (
            <FormField label="Days of Week">
              <div className="flex gap-2">
                {dayLabels.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const newDays = daysOfWeek.includes(idx) ? daysOfWeek.filter((d) => d !== idx) : [...daysOfWeek, idx];
                      setDaysOfWeek(newDays.sort());
                    }}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      daysOfWeek.includes(idx) ? "bg-indigo-600 text-white" : "bg-ops-bg text-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="End Date">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Schedule Time">
            <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
          </FormField>
        </div>
      </Card>

      {/* Preview */}
      {/* Trip Metadata — applies to all created trips */}
      <TripMetadata
        coordinator={metadata.coordinator}
        viewers={metadata.viewers}
        costCenter={metadata.costCenter}
        pos={metadata.pos}
        onUpdate={(updates) => setMetadata((prev) => ({ ...prev, ...updates }))}
      />

      <Card padding="lg" header={<h3 className="font-semibold">Preview ({dates.length} trips)</h3>}>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {dates.length === 0 ? (
            <p className="text-xs text-text-secondary">No dates match the recurrence rule</p>
          ) : (
            dates.slice(0, 10).map((date) => (
              <div key={date} className="flex items-center justify-between bg-ops-bg p-2 rounded text-xs">
                <span className="text-text-primary">{date}</span>
                <span className="text-text-secondary">{scheduleTime}</span>
              </div>
            ))
          )}
          {dates.length > 10 && <p className="text-xs text-text-secondary pt-2">... and {dates.length - 10} more</p>}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleCreate} variant="primary" loading={isCommitting} disabled={dates.length === 0}>
          Create {dates.length} Recurring Trip{dates.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
};

RecurringCreation.displayName = "RecurringCreation";
