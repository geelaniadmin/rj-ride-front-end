"use client";

import React, { useMemo, useState } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useDriverStore } from "@/stores/driverStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useQuoteStore } from "@/stores/quoteStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useToastStore } from "@/stores/toastStore";
import { getTraccarSimulator } from "@/lib/mock/traccar";
import { checkTime } from "@/lib/preflight";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PII } from "@/components/ui/PII";
import { Modal } from "@/components/ui/Modal";
import { MapPin, AlertCircle, CheckCircle, Navigation, Users, Navigation2 } from "lucide-react";

const DEMO_DRIVER_ID = "D1";

export default function DriverPage() {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId), [allTrips, activeTenantId]);
  const advanceVehicleStatus = useTripStore((s) => s.advanceVehicleStatus);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const drivers = useMemo(() => allDrivers.filter((d) => d.tenantId === activeTenantId), [allDrivers, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allOffers = useQuoteStore((s) => s.offers) || [];
  const addToast = useToastStore((s) => s.addToast);
  const traccar = getTraccarSimulator();

  const currentDriver = drivers.find((d) => d.id === DEMO_DRIVER_ID);

  // Find all assigned trips for this driver
  const assignedTrips = useMemo(() => {
    const assigned: Array<{ tripId: string; vehicleIndex: number; trip: any; vehicle: any }> = [];
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle, idx) => {
        if (vehicle.driverId === DEMO_DRIVER_ID) {
          assigned.push({ tripId: trip.id, vehicleIndex: idx, trip, vehicle });
        }
      });
    });
    return assigned;
  }, [trips]);

  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhase, setOtpPhase] = useState<"pickup" | "drop">("pickup");
  const [otpInput, setOtpInput] = useState("");
  const [locationSharing, setLocationSharing] = useState(false);

  const currentAssignment = selectedTripIndex !== null ? assignedTrips[selectedTripIndex] : null;

  const handleAcceptTrip = () => {
    if (!currentAssignment) return;
    const { trip, vehicle, vehicleIndex } = currentAssignment;

    // Check pre-flight: minimum lead time
    if (vehicle.priceId) {
      const offer = allOffers.find((o) => o.priceId === vehicle.priceId);
      if (offer && trip.stops[0]) {
        const pickupTime = trip.stops[0].plannedTime || new Date().toISOString();
        const checkResult = checkTime(offer, pickupTime);

        if (!checkResult.allowBooking) {
          addToast(`Cannot accept: ${checkResult.reasons[0]}`, "error");
          return;
        }
      }
    }

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "DRIVER_ACCEPTED");
    if (result.success) {
      addToast("Trip accepted!", "success");
    } else {
      addToast(result.message, "error");
    }
  };

  const handleRejectTrip = () => {
    if (!currentAssignment) return;
    const { trip, vehicleIndex } = currentAssignment;

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "DRIVER_REJECTED");
    if (result.success) {
      addToast("Trip rejected", "info");
      setSelectedTripIndex(null);
    } else {
      addToast(result.message, "error");
    }
  };

  const handleStartNavigation = () => {
    if (!currentAssignment) return;
    const { trip, vehicleIndex } = currentAssignment;

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "EN_ROUTE_PICKUP");
    if (result.success) {
      addToast("Navigating to pickup...", "info");
    } else {
      addToast(result.message, "error");
    }
  };

  const handleArriveAtPickup = () => {
    if (!currentAssignment) return;
    const { trip, vehicleIndex } = currentAssignment;

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "AT_PICKUP");
    if (result.success) {
      addToast("You've arrived at pickup", "success");
    } else {
      addToast(result.message, "error");
    }
  };

  const handlePickupPassengers = () => {
    if (!currentAssignment?.vehicle.otp?.pickup) {
      addToast("Demo OTP: 1234", "info");
    }
    setOtpPhase("pickup");
    setOtpInput("");
    setShowOtpModal(true);
  };

  const handleVerifyOtp = () => {
    if (!currentAssignment) return;
    const { trip, vehicle, vehicleIndex } = currentAssignment;

    if (otpInput.length < 4) {
      addToast("OTP must be 4 digits", "error");
      return;
    }

    // Validate OTP against stored value (or demo value "1234")
    const expectedOTP = vehicle.otp?.[otpPhase] || "1234";
    if (otpInput !== expectedOTP) {
      addToast(`Incorrect OTP. Expected: ${expectedOTP}`, "error");
      return;
    }

    // Advance vehicle status
    const nextStatus = otpPhase === "pickup" ? "PAX_PICKED" : "PAX_DROPPED";
    const result = advanceVehicleStatus(trip.id, vehicleIndex, nextStatus);

    if (result.success) {
      addToast(otpPhase === "pickup" ? "Passengers picked up!" : "Passengers dropped off!", "success");
      setShowOtpModal(false);

      // Auto-transition after short delay
      setTimeout(() => {
        const autoStatus = otpPhase === "pickup" ? "IN_TRANSIT" : "COMPLETED";
        advanceVehicleStatus(trip.id, vehicleIndex, autoStatus);
        addToast(otpPhase === "pickup" ? "Started trip" : "Trip completed!", "info");
      }, 800);
    } else {
      addToast(result.message, "error");
    }
  };

  const handleDropPassengers = () => {
    if (!currentAssignment) return;
    const { trip, vehicleIndex } = currentAssignment;

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "AT_DROP");
    if (result.success) {
      addToast("You've arrived at drop-off", "success");
    } else {
      addToast(result.message, "error");
    }
  };

  const handleVerifyDropOtp = () => {
    if (!currentAssignment?.vehicle.otp?.drop) {
      addToast("Demo OTP: 1234", "info");
    }
    setOtpPhase("drop");
    setOtpInput("");
    setShowOtpModal(true);
  };

  const handleEmergency = () => {
    if (!currentAssignment) return;
    const { trip, vehicleIndex } = currentAssignment;

    const result = advanceVehicleStatus(trip.id, vehicleIndex, "SOS");
    if (result.success) {
      addToast("🚨 Emergency alert sent to dispatch!", "error");
    } else {
      addToast(result.message, "error");
    }
  };

  const handleLocationSharingToggle = () => {
    if (!currentAssignment?.vehicle.vehicleId) return;

    if (locationSharing) {
      traccar.disableLocationSharing(currentAssignment.vehicle.vehicleId);
    } else {
      traccar.enableLocationSharing(currentAssignment.vehicle.vehicleId);
    }

    setLocationSharing(!locationSharing);
    addToast(`Location sharing ${!locationSharing ? "enabled" : "disabled"}`, "info");
  };

  if (!currentDriver) {
    return (
      <div className="p-6">
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">Demo driver {DEMO_DRIVER_ID} not found</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Driver Header */}
      <Card padding="lg" className="bg-white border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Driver</p>
            <div className="text-lg font-bold text-text-primary mt-1">
              <PII value={currentDriver.name} type="name" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <MapPin className="w-3 h-3 text-text-secondary" />
              <PII value={currentDriver.phone} type="phone" />
              {currentDriver.rating && <span className="text-alert-amber ml-2">★ {currentDriver.rating}</span>}
            </div>
          </div>
          <Badge variant={currentDriver.available ? "green" : "amber"}>{currentDriver.available ? "Available" : "Offline"}</Badge>
        </div>
      </Card>

      {/* Location Sharing Toggle */}
      <div className="flex items-center gap-2 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
        <input
          type="checkbox"
          id="locationSharing"
          checked={locationSharing}
          onChange={handleLocationSharingToggle}
          className="w-4 h-4"
        />
        <label htmlFor="locationSharing" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
          <Navigation2 className="w-4 h-4 text-brand-blue" />
          Sharing location
        </label>
      </div>

      {/* Trip List */}
      <div className="space-y-3">
        {assignedTrips.length === 0 ? (
          <Card padding="lg" className="text-center text-text-secondary py-8">
            <p>No assigned trips. Check back later.</p>
          </Card>
        ) : (
          assignedTrips.map((assignment, idx) => {
            const { trip, vehicle } = assignment;
            const customer = customers.find((c) => c.id === trip.customerId);
            const isSelected = selectedTripIndex === idx;

            return (
              <div
                key={idx}
                className={`cursor-pointer transition-all border-2 rounded-xl overflow-hidden ${
                  isSelected ? "border-brand-blue bg-brand-blue/5" : "border-border hover:border-brand-blue/50"
                }`}
                onClick={() => setSelectedTripIndex(isSelected ? null : idx)}
              >
                <div className="p-4 space-y-3">
                  {/* Status & Customer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={vehicle.status} />
                      <span className="text-sm font-medium text-text-primary">{customer?.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary">{trip.stops.length} stops</span>
                  </div>

                  {isSelected && (
                    <div className="border-t border-border pt-3 space-y-3">
                      {/* Pickup Location */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-success flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Pickup
                        </p>
                        <p className="text-sm text-text-primary">{trip.stops[0]?.address}</p>
                      </div>

                      {/* Drop Location */}
                      {trip.stops.length > 1 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-brand-blue flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Drop
                          </p>
                          <p className="text-sm text-text-primary">{trip.stops[1]?.address}</p>
                        </div>
                      )}

                      {/* Passengers */}
                      {vehicle.pax.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-text-primary flex items-center gap-1">
                            <Users className="w-3 h-3" /> Passengers ({vehicle.pax.length})
                          </p>
                          <div className="space-y-1">
                            {vehicle.pax.map((pax: any) => (
                              <div key={pax.id} className="text-xs text-text-primary">
                                {pax.name ? <PII value={pax.name} type="name" /> : "Passenger"}
                                {pax.phone && (
                                  <>
                                    {" "}
                                    <PII value={pax.phone} type="phone" />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      {vehicle.lockedPrice && (
                        <p className="text-xs">
                          <span className="text-text-secondary">Fare: </span>
                          <span className="text-success font-medium">₹{vehicle.lockedPrice}</span>
                        </p>
                      )}

                      {/* State-Specific Actions */}
                      <div className="border-t border-border pt-3 space-y-2">
                        {vehicle.status === "ASSIGNED" && (
                          <>
                            <Button onClick={handleAcceptTrip} variant="primary" className="w-full">
                              <CheckCircle className="w-3 h-3 mr-2" /> Accept Trip
                            </Button>
                            <Button onClick={handleRejectTrip} variant="ghost" className="w-full">
                              Reject
                            </Button>
                          </>
                        )}

                        {vehicle.status === "DRIVER_ACCEPTED" && (
                          <Button onClick={handleStartNavigation} variant="primary" className="w-full">
                            <Navigation className="w-3 h-3 mr-2" /> Start Navigation
                          </Button>
                        )}

                        {vehicle.status === "EN_ROUTE_PICKUP" && (
                          <Button onClick={handleArriveAtPickup} variant="primary" className="w-full">
                            <MapPin className="w-3 h-3 mr-2" /> Arrived at Pickup
                          </Button>
                        )}

                        {vehicle.status === "AT_PICKUP" && (
                          <Button onClick={handlePickupPassengers} variant="primary" className="w-full">
                            <Users className="w-3 h-3 mr-2" /> Pickup Passengers (OTP)
                          </Button>
                        )}

                        {vehicle.status === "IN_TRANSIT" && (
                          <Button onClick={handleDropPassengers} variant="primary" className="w-full">
                            <Navigation className="w-3 h-3 mr-2" /> Arrived at Drop
                          </Button>
                        )}

                        {vehicle.status === "AT_DROP" && (
                          <Button onClick={handleVerifyDropOtp} variant="primary" className="w-full">
                            <CheckCircle className="w-3 h-3 mr-2" /> Drop Passengers (OTP)
                          </Button>
                        )}

                        {["ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "IN_TRANSIT", "AT_DROP"].includes(
                          vehicle.status
                        ) && (
                          <Button onClick={handleEmergency} variant="ghost" className="w-full text-danger hover:bg-danger/10">
                            <AlertCircle className="w-3 h-3 mr-2" /> Emergency (SOS)
                          </Button>
                        )}

                        {vehicle.status === "SOS" && (
                          <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg text-xs text-danger flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Emergency reported. Help is on the way.
                          </div>
                        )}

                        {vehicle.status === "COMPLETED" && (
                          <div className="p-3 bg-success/5 border border-success/20 rounded-lg text-xs text-success flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Trip completed!
                          </div>
                        )}

                        {vehicle.status === "DRIVER_REJECTED" && (
                          <div className="p-3 bg-ops-card2 border border-border rounded-lg text-xs text-text-secondary">
                            Trip rejected. New trips coming soon.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* OTP Verification Modal */}
      <Modal open={showOtpModal} onClose={() => setShowOtpModal(false)} title={`Verify ${otpPhase === "pickup" ? "Pickup" : "Drop"} OTP`}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Enter OTP provided by {otpPhase === "pickup" ? "passengers" : "customer"}
            <br />
            <strong className="text-text-primary">(Demo: 1234)</strong>
          </p>
          <Input
            placeholder="Enter 4-digit OTP"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.slice(0, 4))}
            maxLength={4}
            type="text"
            className="text-center text-2xl tracking-widest"
          />
          <Button onClick={handleVerifyOtp} variant="primary" className="w-full">
            Verify OTP
          </Button>
        </div>
      </Modal>

      {/* Legend */}
      <Card padding="lg" header={<h3 className="font-semibold text-sm">📋 Trip Lifecycle</h3>}>
        <div className="space-y-2 text-xs text-text-secondary">
          <p>
            1️⃣ <strong>ASSIGNED</strong> → Accept/Reject trip (checked against min lead time)
          </p>
          <p>2️⃣ <strong>DRIVER_ACCEPTED</strong> → Start navigation</p>
          <p>3️⃣ <strong>EN_ROUTE_PICKUP</strong> → Arrive at pickup</p>
          <p>4️⃣ <strong>AT_PICKUP</strong> → Verify OTP & pickup passengers (must match: 1234)</p>
          <p>5️⃣ <strong>IN_TRANSIT</strong> → Navigate to drop</p>
          <p>6️⃣ <strong>AT_DROP</strong> → Verify OTP & drop passengers (must match: 1234)</p>
          <p>7️⃣ <strong>COMPLETED</strong> → Trip done!</p>
          <p>🚨 <strong>SOS</strong> → Emergency alert (any time)</p>
          <p className="pt-2 text-brand-blue">
            📍 <strong>Location Sharing:</strong> Toggle above to enable/disable your position on tracking map
          </p>
        </div>
      </Card>
    </div>
  );
}
