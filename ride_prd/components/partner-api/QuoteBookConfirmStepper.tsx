"use client";

import React, { useState, useMemo } from "react";
import { useVendorStore } from "@/stores/vendorStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTripStore } from "@/stores/tripStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useToastStore } from "@/stores/toastStore";
import { useQuoteStore } from "@/stores/quoteStore";
import { getOffers } from "@/lib/quote";
import { checkTime } from "@/lib/preflight";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Offer, Stop, VehicleStatus } from "@/lib/types";
import { ChevronRight, CheckCircle, AlertCircle, Lock } from "lucide-react";

interface StepperState {
  step: 1 | 2 | 3 | 4;
  quote: {
    vendorId: string;
    customerId: string;
    vehicleTypeId: string;
    distance: number;
    hours: number;
    quotedAt: string;
  };
  offers: Offer[];
  selectedOfferIndex: number | null;
  checkTimeResult: any;
  order: {
    priceId: string;
    pickupLocation: string;
    dropLocation: string;
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    paxName: string;
    paxPhone: string;
    paxEmail: string;
    numberOfPassengers: number;
  };
  tripId: string | null;
}

export const QuoteBookConfirmStepper: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const vendors = useVendorStore((s) => s.vendors).filter((v) => v.tenantId === activeTenantId);
  const customers = useCustomerStore((s) => s.customers).filter((c) => c.tenantId === activeTenantId);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes).filter((v) => v.tenantId === activeTenantId);
  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  const todayDate = new Date().toISOString().split("T")[0] || "";

  const [state, setState] = useState<StepperState>({
    step: 1,
    quote: {
      vendorId: vendors[0]?.id || "",
      customerId: customers[0]?.id || "",
      vehicleTypeId: vehicleTypes[0]?.id || "",
      distance: 10,
      hours: 1,
      quotedAt: todayDate,
    },
    offers: [],
    selectedOfferIndex: null,
    checkTimeResult: null,
    order: {
      priceId: "",
      pickupLocation: "Bengaluru Airport",
      dropLocation: "Whitefield Tech Park",
      pickupLat: 13.1979,
      pickupLng: 77.7063,
      dropLat: 12.9698,
      dropLng: 77.7499,
      paxName: "John Doe",
      paxPhone: "+91-98765-43210",
      paxEmail: "john@example.com",
      numberOfPassengers: 1,
    },
    tripId: null,
  });

  // Step 1: Get Offers
  const handleGetOffers = () => {
    const offers = getOffers({
      tenantId: activeTenantId,
      vendorId: state.quote.vendorId,
      customerId: state.quote.customerId,
      vehicleTypeId: state.quote.vehicleTypeId,
      quotedAt: state.quote.quotedAt,
      currency: "INR",
      distance: state.quote.distance,
      hours: state.quote.hours,
    });

    if (offers.length === 0) {
      addToast("No applicable rate cards found", "error");
      return;
    }

    setState((s) => ({
      ...s,
      offers,
      selectedOfferIndex: 0,
      step: 2,
    }));
    addToast(`Got ${offers.length} offer(s)`, "success");
  };

  // Step 2: Check Time
  const handleCheckTime = () => {
    const selectedOffer = state.offers[state.selectedOfferIndex || 0];
    if (!selectedOffer) {
      addToast("No offer selected", "error");
      return;
    }

    const pickupTime = state.quote.quotedAt + "T" + (Math.random() > 0.5 ? "10:00" : "14:00");
    const result = checkTime(selectedOffer, pickupTime);

    setState((s) => ({
      ...s,
      checkTimeResult: result,
    }));

    if (result.allowBooking) {
      setState((s) => ({ ...s, step: 3 }));
      addToast("Pre-flight checks passed ✅", "success");
    } else {
      addToast(`Check failed: ${result.reasons[0]}`, "error");
    }
  };

  // Step 3: Create Order
  const handleCreateOrder = () => {
    const selectedOffer = state.offers[state.selectedOfferIndex || 0];
    if (!selectedOffer) {
      addToast("No offer selected", "error");
      return;
    }

    setState((s) => ({
      ...s,
      order: {
        ...s.order,
        priceId: selectedOffer.priceId,
      },
      step: 4,
    }));
    addToast("Order created with price lock", "success");
  };

  // Step 4: Confirm & Create Trip
  const handleConfirmTrip = () => {
    const selectedOffer = state.offers[state.selectedOfferIndex || 0];
    if (!selectedOffer) {
      addToast("No offer selected", "error");
      return;
    }

    const tripId = addTrip({
      tenantId: activeTenantId,
      customerId: state.quote.customerId,
      createdVia: "API_PAX",
      stops: [
        {
          seq: 1,
          type: "PICKUP",
          locationType: "CITY",
          address: state.order.pickupLocation,
          lat: state.order.pickupLat,
          lng: state.order.pickupLng,
          plannedTime: state.quote.quotedAt + "T10:00:00Z",
        },
        {
          seq: 2,
          type: "DROP",
          locationType: "CITY",
          address: state.order.dropLocation,
          lat: state.order.dropLat,
          lng: state.order.dropLng,
        },
      ],
      vehicles: [
        {
          id: `V-${Date.now()}`,
          requestedVehicleTypeId: state.quote.vehicleTypeId,
          priceId: selectedOffer.priceId,
          lockedPrice: selectedOffer.price,
          lockedRateCardVersion: selectedOffer.rateCardVersion,
          status: "PENDING" as VehicleStatus,
          pax: [
            {
              id: `P-${Date.now()}`,
              name: state.order.paxName,
              phone: state.order.paxPhone,
              email: state.order.paxEmail,
            },
          ],
        },
      ],
      schedule: { type: "ONE_OFF", when: state.quote.quotedAt + "T10:00:00Z" },
      status: "CONFIRMED",
      autoAssign: true,
    });

    setState((s) => ({ ...s, tripId }));
    addToast(`Trip created: ${tripId}`, "success");
  };

  const selectedOffer = state.selectedOfferIndex !== null ? state.offers[state.selectedOfferIndex] : null;
  const vendor = vendors.find((v) => v.id === state.quote.vendorId);
  const customer = customers.find((c) => c.id === state.quote.customerId);
  const vehicleType = vehicleTypes.find((v) => v.id === state.quote.vehicleTypeId);

  const steps = [
    { num: 1, label: "Get Quote", complete: state.offers.length > 0 },
    { num: 2, label: "Check Time", complete: state.checkTimeResult?.allowBooking },
    { num: 3, label: "Create Order", complete: state.order.priceId },
    { num: 4, label: "Confirm & Book", complete: state.tripId },
  ];

  return (
    <div className="space-y-6">
      {/* Stepper Progress */}
      <div className="flex items-center gap-2 bg-ops-bg p-4 rounded-lg border border-border">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs transition-colors ${
                state.step === s.num
                  ? "bg-brand-blue text-white"
                  : s.complete
                    ? "bg-success text-white"
                    : "bg-border text-text-secondary"
              }`}
            >
              {s.complete ? <CheckCircle className="w-4 h-4" /> : s.num}
            </div>
            <p className={`text-sm font-medium ${state.step >= s.num ? "text-text-primary" : "text-text-secondary"}`}>
              {s.label}
            </p>
            {idx < steps.length - 1 && <div className={`flex-1 h-0.5 ${state.step > s.num ? "bg-success" : "bg-border"}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Get Quote */}
      {state.step === 1 && (
        <Card padding="lg" header={<h3 className="font-semibold">Step 1: Request Quote</h3>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Vendor">
                <Select
                  value={state.quote.vendorId}
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, vendorId: e.target.value } }))}
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                />
              </FormField>

              <FormField label="Customer">
                <Select
                  value={state.quote.customerId}
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, customerId: e.target.value } }))}
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                />
              </FormField>

              <FormField label="Vehicle Type">
                <Select
                  value={state.quote.vehicleTypeId}
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, vehicleTypeId: e.target.value } }))}
                  options={vehicleTypes.map((v) => ({ value: v.id, label: v.name }))}
                />
              </FormField>

              <FormField label="Quote Date">
                <Input
                  type="date"
                  value={state.quote.quotedAt}
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, quotedAt: e.target.value } }))}
                />
              </FormField>

              <FormField label="Distance (KM)">
                <Input
                  type="number"
                  value={state.quote.distance}
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, distance: parseFloat(e.target.value) || 0 } }))}
                />
              </FormField>

              <FormField label="Duration (Hours)">
                <Input
                  type="number"
                  value={state.quote.hours}
                  step="0.5"
                  onChange={(e) => setState((s) => ({ ...s, quote: { ...s.quote, hours: parseFloat(e.target.value) || 0 } }))}
                />
              </FormField>
            </div>

            <Button onClick={handleGetOffers} variant="primary" className="w-full">
              <ChevronRight className="w-4 h-4 mr-2" /> Get Offers
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Check Time */}
      {state.step === 2 && selectedOffer && (
        <Card padding="lg" header={<h3 className="font-semibold">Step 2: Pre-flight Check</h3>}>
          <div className="space-y-4">
            <div className="p-4 bg-ops-bg rounded border border-border">
              <p className="text-sm font-medium text-text-primary mb-2">Selected Offer</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
                <div>
                  <span className="text-text-tertiary">Price:</span> ₹{selectedOffer.price}
                </div>
                <div>
                  <span className="text-text-tertiary">Version:</span> v{selectedOffer.rateCardVersion}
                </div>
                <div>
                  <span className="text-text-tertiary">Expires:</span> {new Date(selectedOffer.expiresAt).toLocaleString()}
                </div>
                <div>
                  <span className="text-text-tertiary">Free Cancel:</span> {selectedOffer.freeCancellationHours}h
                </div>
              </div>
            </div>

            {state.checkTimeResult && (
              <div
                className={`p-4 rounded border ${
                  state.checkTimeResult.allowBooking
                    ? "bg-success/10 border-success/20"
                    : "bg-danger/10 border-danger/20"
                }`}
              >
                <p className={`text-sm font-medium ${state.checkTimeResult.allowBooking ? "text-success" : "text-danger"}`}>
                  {state.checkTimeResult.allowBooking ? "✅ Checks Passed" : "❌ Checks Failed"}
                </p>
                <ul className="text-xs text-text-secondary mt-2 space-y-1">
                  {state.checkTimeResult.reasons.map((r: string, i: number) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleCheckTime} variant="primary" className="w-full">
              <Lock className="w-4 h-4 mr-2" /> Validate & Lock Price
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Create Order */}
      {state.step === 3 && (
        <Card padding="lg" header={<h3 className="font-semibold">Step 3: Create Order</h3>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Pickup Location">
                <Input
                  value={state.order.pickupLocation}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, pickupLocation: e.target.value } }))}
                />
              </FormField>

              <FormField label="Drop Location">
                <Input
                  value={state.order.dropLocation}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, dropLocation: e.target.value } }))}
                />
              </FormField>

              <FormField label="Passenger Name">
                <Input
                  value={state.order.paxName}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, paxName: e.target.value } }))}
                />
              </FormField>

              <FormField label="Passenger Phone">
                <Input
                  value={state.order.paxPhone}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, paxPhone: e.target.value } }))}
                />
              </FormField>

              <FormField label="Passenger Email">
                <Input
                  value={state.order.paxEmail}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, paxEmail: e.target.value } }))}
                />
              </FormField>

              <FormField label="Number of Passengers">
                <Input
                  type="number"
                  min="1"
                  value={state.order.numberOfPassengers}
                  onChange={(e) => setState((s) => ({ ...s, order: { ...s.order, numberOfPassengers: parseInt(e.target.value) || 1 } }))}
                />
              </FormField>
            </div>

            <div className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded">
              <p className="text-xs text-text-primary font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Price locked at ₹{selectedOffer?.price || "—"}
              </p>
            </div>

            <Button onClick={handleCreateOrder} variant="primary" className="w-full">
              <ChevronRight className="w-4 h-4 mr-2" /> Create Order
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Confirm & Book */}
      {state.step === 4 && (
        <Card padding="lg" header={<h3 className="font-semibold">Step 4: Confirm Booking</h3>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-ops-bg rounded border border-border text-sm">
              <div>
                <p className="text-text-tertiary">Vendor</p>
                <p className="text-text-primary font-medium">{vendor?.name}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Customer</p>
                <p className="text-text-primary font-medium">{customer?.name}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Vehicle Type</p>
                <p className="text-text-primary font-medium">{vehicleType?.name}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Locked Price</p>
                <p className="text-text-primary font-medium">₹{selectedOffer?.price}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Passenger</p>
                <p className="text-text-primary font-medium">{state.order.paxName}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Pickup</p>
                <p className="text-text-primary font-medium">{state.order.pickupLocation}</p>
              </div>
            </div>

            {state.tripId && (
              <div className="p-4 bg-success/10 border border-success/20 rounded">
                <p className="text-sm text-success font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Trip Created Successfully
                </p>
                <p className="text-xs text-text-secondary mt-2">Trip ID: {state.tripId}</p>
              </div>
            )}

            {!state.tripId && (
              <Button onClick={handleConfirmTrip} variant="primary" className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Create Trip
              </Button>
            )}

            {state.tripId && (
              <Button
                onClick={() =>
                  setState({
                    step: 1,
                    quote: {
                      vendorId: vendors[0]?.id || "",
                      customerId: customers[0]?.id || "",
                      vehicleTypeId: vehicleTypes[0]?.id || "",
                      distance: 10,
                      hours: 1,
                      quotedAt: todayDate,
                    },
                    offers: [],
                    selectedOfferIndex: null,
                    checkTimeResult: null,
                    order: {
                      priceId: "",
                      pickupLocation: "Bengaluru Airport",
                      dropLocation: "Whitefield Tech Park",
                      pickupLat: 13.1979,
                      pickupLng: 77.7063,
                      dropLat: 12.9698,
                      dropLng: 77.7499,
                      paxName: "John Doe",
                      paxPhone: "+91-98765-43210",
                      paxEmail: "john@example.com",
                      numberOfPassengers: 1,
                    },
                    tripId: null,
                  })
                }
                variant="secondary"
                className="w-full"
              >
                Start New Quote
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

QuoteBookConfirmStepper.displayName = "QuoteBookConfirmStepper";
