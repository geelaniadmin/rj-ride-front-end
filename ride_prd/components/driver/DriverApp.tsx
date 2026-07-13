"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useDriverStore } from "@/stores/driverStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useCustomerStore, useTenantStore, useAlertStore } from "@ride/shared";
import { useQuoteStore } from "@/stores/quoteStore";
import { useToastStore } from "@/stores/toastStore";
import { useDriverSessionStore } from "@/stores/driverSessionStore";
import { getTraccarSimulator } from "@/lib/mock/traccar";
import { checkTime } from "@/lib/preflight";
import { PII } from "@/components/ui/PII";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";
import {
  MapPin,
  AlertCircle,
  CheckCircle,
  Navigation,
  Users,
  Navigation2,
  Car,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const BREAKDOWN_REASONS = ["Tyre", "Engine", "Accident", "Other"] as const;

// Dynamic import — Leaflet only in browser
const MapComponent = dynamic(() => import("@/components/trips/MapComponent"), { ssr: false });

interface DriverAppProps {
  compact?: boolean;
}

export const DriverApp: React.FC<DriverAppProps> = ({ compact = false }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId), [allTrips, activeTenantId]);
  const advanceVehicleStatus = useTripStore((s) => s.advanceVehicleStatus);
  const verifyOtp = useTripStore((s) => s.verifyOtp);
  const reportBreakdown = useTripStore((s) => s.reportBreakdown);
  const performVehicleSwap = useTripStore((s) => s.performVehicleSwap);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const drivers = useMemo(() => allDrivers.filter((d) => d.tenantId === activeTenantId), [allDrivers, activeTenantId]);
  const allVehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allOffers = useQuoteStore((s) => s.offers) || [];
  const addToast = useToastStore((s) => s.addToast);
  const addAlert = useAlertStore((s) => s.addAlert);
  const addNotification = useAlertStore((s) => s.addNotification);
  const selectedDriverId = useDriverSessionStore((s) => s.selectedDriverId);
  const selectDriver = useDriverSessionStore((s) => s.selectDriver);
  const logout = useDriverSessionStore((s) => s.logout);
  const currentDriver = selectedDriverId ? drivers.find((d) => d.id === selectedDriverId) : null;
  const traccar = getTraccarSimulator();

  // Find assigned trips for the selected driver
  const assignedTrips = useMemo(() => {
    if (!selectedDriverId) return [];
    const assigned: Array<{ tripId: string; vehicleIndex: number; trip: any; vehicle: any }> = [];
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle: any, idx: number) => {
        if (vehicle.driverId === selectedDriverId) {
          assigned.push({ tripId: trip.id, vehicleIndex: idx, trip, vehicle });
        }
      });
    });
    return assigned;
  }, [trips, selectedDriverId]);

  // UI state
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhase, setOtpPhase] = useState<"pickup" | "drop">("pickup");
  const [otpInput, setOtpInput] = useState("");
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [otpBlocked, setOtpBlocked] = useState(false);
  const [otpRemaining, setOtpRemaining] = useState<number | null>(null);

  const currentAssignment = selectedTripIndex !== null ? assignedTrips[selectedTripIndex] : null;
  const currentVehicle = currentAssignment?.vehicle;
  const currentTrip = currentAssignment?.trip;
  const currentVehicleMeta = currentVehicle?.vehicleId ? allVehicles.find((v) => v.id === currentVehicle.vehicleId) : null;
  const currentVTypeName = currentVehicleMeta?.vehicleTypeId ? allVehicleTypes.find((vt) => vt.id === currentVehicleMeta.vehicleTypeId)?.name : null;
  const customer = currentTrip ? customers.find((c) => c.id === currentTrip.customerId) : null;
  const pickupStop = currentTrip?.stops?.[0];
  const dropStop = currentTrip?.stops?.[currentTrip?.stops?.length - 1];

  const status = currentVehicle?.status || "PENDING";
  const isActive = ["DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"].includes(status);
  const isComplete = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);

  // ── GPS Simulation ──────────────────────────────────────────────────
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "IN_TRANSIT" && currentTrip && currentAssignment) {
      // Start GPS simulation — send position every 5 seconds
      traccar.updateVehicleStatus(currentAssignment.vehicle.vehicleId || "", "IN_TRANSIT", currentTrip.stops);
      gpsIntervalRef.current = setInterval(() => {
        const stopsMap = new Map<string, typeof currentTrip.stops>();
        stopsMap.set(currentAssignment.tripId, currentTrip.stops);
        traccar.updatePositions(stopsMap);
      }, 5000);
    }
    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
        gpsIntervalRef.current = null;
      }
    };
  }, [status, currentTrip?.id, currentAssignment?.vehicle.vehicleId]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const advance = useCallback(
    (nextStatus: string, successMsg: string) => {
      if (!currentAssignment) return;
      const result = advanceVehicleStatus(currentAssignment.tripId, currentAssignment.vehicleIndex, nextStatus as any);
      addToast(result.success ? successMsg : result.message, result.success ? "success" : "error");
    },
    [currentAssignment, advanceVehicleStatus, addToast]
  );

  // ── STEP 2 — Start Navigation ───────────────────────────────────────
  const handleStartNavigation = useCallback(() => {
    if (!currentAssignment || !currentTrip) return;
    // Update traccar to start moving
    traccar.updateVehicleStatus(currentAssignment.vehicle.vehicleId || "", "EN_ROUTE_PICKUP", currentTrip.stops);
    advance("EN_ROUTE_PICKUP", "Navigating to pickup...");
  }, [currentAssignment, currentTrip, advance, traccar]);

  // ── STEP 3 — Arrive at Pickup ───────────────────────────────────────
  const handleArriveAtPickup = useCallback(() => {
    if (!currentAssignment || !currentTrip) return;
    advance("AT_PICKUP", "You've arrived at pickup");
    // Notify passenger
    addNotification({
      vendorId: currentAssignment.vehicle.vendorId || "",
      type: "DRIVER_ARRIVED",
      title: "Driver has arrived",
      message: `Your driver has arrived at ${currentTrip.stops[0]?.address || "pickup location"}`,
      tripId: currentAssignment.tripId,
      read: false,
    });
  }, [currentAssignment, currentTrip, advance, addNotification]);

  // ── STEP 4 — OTP Verify (Hard Gate) ────────────────────────────────
  const openOtpModal = useCallback(
    (phase: "pickup" | "drop") => {
      setOtpPhase(phase);
      setOtpInput("");
      setOtpBlocked(false);
      setOtpRemaining(null);
      setShowOtpModal(true);
    },
    []
  );

  const handleVerifyOtp = useCallback(() => {
    if (!currentAssignment) return;
    const { tripId, vehicleIndex } = currentAssignment;

    if (otpInput.length < 4) {
      addToast("OTP must be 4 digits", "error");
      return;
    }

    const result = verifyOtp(tripId, vehicleIndex, otpPhase, otpInput);

    if (result.success) {
      addToast(`✓ ${otpPhase === "pickup" ? "Pickup" : "Drop"} OTP verified!`, "success");
      setShowOtpModal(false);
      setOtpBlocked(false);
      // Now the PAX_PICKED / PAX_DROPPED button will be enabled because
      // pickupVerified / dropVerified is true in the store
    } else {
      if (result.blocked) {
        setOtpBlocked(true);
        addToast("🚨 " + result.message, "error");
        // Raise alert to dispatcher
        addAlert({
          tenantId: currentAssignment.trip.tenantId,
          type: "OTP_BLOCKED",
          severity: "critical",
          message: `Driver ${selectedDriverId} — OTP blocked after 3 failed attempts for trip ${currentAssignment.tripId.slice(0, 8)}`,
          tripId: currentAssignment.tripId,
          vendorId: currentAssignment.vehicle.vendorId || "",
          read: false,
        });
      } else {
        setOtpRemaining(result.remainingAttempts ?? 0);
        addToast(result.message, "error");
      }
    }
  }, [currentAssignment, otpInput, otpPhase, verifyOtp, addAlert, addToast, selectedDriverId]);

  // ── STEP 5 — Passengers Aboard → Start Trip ──────────────────────────
  const handlePaxPicked = useCallback(() => {
    advance("PAX_PICKED", "Passengers aboard!");
  }, [advance]);

  const handleStartTrip = useCallback(() => {
    advance("IN_TRANSIT", "Trip started — en route to destination");
  }, [advance]);

  // ── STEP 6 — Arrive at Drop ───────────────────────────────────────────
  const handleArriveAtDrop = useCallback(() => {
    advance("AT_DROP", "Arrived at drop-off location");
  }, [advance]);

  // ── STEP 7 — Trip Complete ────────────────────────────────────────────
  const handlePaxDropped = useCallback(() => {
    advance("PAX_DROPPED", "Passengers dropped off!");
  }, [advance]);

  const handleCompleteTrip = useCallback(() => {
    advance("COMPLETED", "Trip completed!");
  }, [advance]);

  // ── STEP 8 — SOS Emergency ─────────────────────────────────────────────
  const handleEmergency = useCallback(() => {
    if (!currentAssignment) return;
    const { tripId, trip, vehicle, vehicleIndex } = currentAssignment;
    const result = advanceVehicleStatus(tripId, vehicleIndex, "SOS" as any);
    if (result.success) {
      // Push SOS alert to shared alertStore — picked up by ops portal
      addAlert({
        tenantId: trip.tenantId,
        type: "SOS_RAISED",
        severity: "critical",
        message: `Driver ${selectedDriverId} raised an SOS emergency`,
        tripId: tripId,
        vendorId: vehicle.vendorId || "",
        read: false,
      });
      addToast("🚨 SOS sent! Dispatch notified.", "error");
    } else {
      addToast(result.message, "error");
    }
    setShowSosConfirm(false);
  }, [currentAssignment, advanceVehicleStatus, addAlert, addToast, selectedDriverId]);

  // ── STEP 9 — Breakdown Report + Auto Vehicle Swap ─────────────────────
  const handleBreakdown = useCallback(
    (reason: string) => {
      if (!currentAssignment) return;
      const { tripId, trip, vehicle, vehicleIndex } = currentAssignment;

      // Step 1: Report the breakdown (set status to BREAKDOWN)
      const breakdownResult = reportBreakdown(tripId, vehicleIndex, reason);
      if (!breakdownResult.success) {
        addToast(breakdownResult.message, "error");
        setShowBreakdownModal(false);
        return;
      }

      // Step 2: Auto-swap to a replacement vehicle (preserves priceId, OTP, tripId)
      const swapResult = performVehicleSwap(tripId, vehicleIndex, reason);

      // Alert dispatcher
      addAlert({
        tenantId: trip.tenantId,
        type: "VEHICLE_BREAKDOWN",
        severity: "HIGH",
        message: swapResult.success
          ? `Vehicle breakdown on trip ${tripId.slice(0, 8)}: ${reason}. Swapped to ${swapResult.replacementVehiclePlate} (driver: ${swapResult.replacementDriverName || "TBD"}).`
          : `Vehicle breakdown on trip ${tripId.slice(0, 8)}: ${reason}. ${swapResult.message}`,
        tripId,
        vendorId: vehicle.vendorId || "",
        read: false,
      });

      // Notify passenger with specific replacement details
      addNotification({
        vendorId: swapResult.replacementVendorId || vehicle.vendorId || "",
        type: "VEHICLE_BREAKDOWN",
        title: "Vehicle Change",
        message: swapResult.success
          ? `Your vehicle has changed — new driver ${swapResult.replacementDriverName || "assigned"} is on the way. Vehicle: ${swapResult.replacementVehiclePlate}. Same trip — no rebooking needed.`
          : `Your vehicle has changed due to a breakdown. A replacement is on the way.`,
        tripId,
        read: false,
      });

      addToast(
        swapResult.success
          ? `⚠️ Breakdown: ${reason}. Swapped to ${swapResult.replacementVehiclePlate} (driver: ${swapResult.replacementDriverName || "TBD"}).`
          : `⚠️ Breakdown: ${reason}. ${swapResult.message}`,
        swapResult.success ? "info" : "error"
      );

      setShowBreakdownModal(false);
    },
    [currentAssignment, reportBreakdown, performVehicleSwap, addAlert, addNotification, addToast]
  );

  // ── Location Sharing ──────────────────────────────────────────────────
  const handleLocationSharingToggle = useCallback(() => {
    if (!currentAssignment?.vehicle.vehicleId) return;
    if (locationSharing) {
      traccar.disableLocationSharing(currentAssignment.vehicle.vehicleId);
    } else {
      traccar.enableLocationSharing(currentAssignment.vehicle.vehicleId);
    }
    setLocationSharing(!locationSharing);
    addToast(`Location sharing ${!locationSharing ? "enabled" : "disabled"}`, "info");
  }, [currentAssignment, locationSharing, traccar, addToast]);

  // ── Render ────────────────────────────────────────────────────────────
  // ── DRIVER SELECTOR (when no driver logged in) ──
  if (!currentDriver) {
    return (
      <div className={`space-y-3 ${compact ? "p-3" : "p-4 max-w-2xl mx-auto"}`}>
        {/* ── Selector Header ── */}
        <div className="bg-gradient-to-br from-brand-blue to-indigo-700 rounded-xl p-4 text-center">
          <Car className="w-10 h-10 text-white/80 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white">RIDE Driver</h2>
          <p className="text-[11px] text-white/70 mt-1">Select your profile to continue</p>
        </div>

        {/* ── Driver List ── */}
        <div className="space-y-2">
          {drivers.length === 0 ? (
            <div className="bg-white border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-text-secondary">No drivers available</p>
            </div>
          ) : (
            drivers.map((driver) => {
              const driverAssignedCount = trips.filter((t) =>
                t.vehicles.some((v: any) => v.driverId === driver.id)
              ).length;
              return (
                <div
                  key={driver.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    selectDriver(driver.id);
                    addToast(`Logged in as ${driver.name}`, "success");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectDriver(driver.id);
                      addToast(`Logged in as ${driver.name}`, "success");
                    }
                  }}
                  className="w-full bg-white border border-border rounded-xl p-3 hover:border-brand-blue/40 hover:shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-sm font-bold text-brand-blue shrink-0">
                      {driver.name.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-text-primary">
                        <PII value={driver.name} type="name" />
                      </span>
                      <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-2">
                        <span>{driver.languages?.join(", ") || "Hindi, English"}</span>
                        {driver.rating && <span className="text-amber-500">★ {driver.rating}</span>}
                        <span className="text-text-secondary/50">·</span>
                        <span>{driverAssignedCount} trip{driverAssignedCount !== 1 ? "s" : ""}</span>
                      </p>
                    </div>
                    <Badge variant={driver.available ? "green" : "amber"}>
                      {driver.available ? "Active" : "Offline"}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-text-secondary/60 text-center pt-2">
          {drivers.length} driver{drivers.length !== 1 ? "s" : ""} available
        </p>
      </div>
    );
  }

  const showMap = status === "EN_ROUTE_PICKUP" || status === "IN_TRANSIT";

  return (
    <div className={`space-y-3 ${compact ? "p-3" : "p-4 max-w-2xl mx-auto"}`}>
      {/* ── Driver Header ── */}
      <div className={`bg-white border border-border rounded-xl ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-secondary">Driver</p>
            <div className={`font-bold text-text-primary mt-0.5 ${compact ? "text-base" : "text-lg"}`}>
              <PII value={currentDriver.name} type="name" />
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <MapPin className="w-3 h-3 text-text-secondary" />
              <PII value={currentDriver.phone} type="phone" />
              {currentDriver.rating && <span className="text-alert-amber ml-1">★ {currentDriver.rating}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={currentDriver.available ? "green" : "amber"}>
              {currentDriver.available ? "Available" : "Offline"}
            </Badge>
            <button
              onClick={() => {
                logout();
                addToast("Logged out", "success");
              }}
              className="p-1.5 rounded-lg hover:bg-danger/5 text-text-secondary hover:text-danger transition-colors"
              title="Switch Driver"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Location Sharing ── */}
      <div className="flex items-center gap-2 p-2.5 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
        <input
          type="checkbox"
          id="ls"
          checked={locationSharing}
          onChange={handleLocationSharingToggle}
          className="w-3.5 h-3.5"
        />
        <label htmlFor="ls" className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-text-primary">
          <Navigation2 className="w-3.5 h-3.5 text-brand-blue" />
          Sharing location
        </label>
      </div>

      {/* ── Trip Inbox ── */}
      <div className="space-y-2.5">
        {assignedTrips.length === 0 ? (
          <div className={`bg-white border border-border rounded-xl text-center text-text-secondary ${compact ? "p-8" : "py-8"}`}>
            <Car className="w-8 h-8 mx-auto mb-2 text-text-secondary/50" />
            <p className="text-sm">No trips assigned. Check back later.</p>
          </div>
        ) : (
          assignedTrips.map((assignment, idx) => {
            const { trip, vehicle } = assignment;
            const cust = customers.find((c) => c.id === trip.customerId);
            const isSelected = selectedTripIndex === idx;

            return (
              <div key={idx} className="transition-all rounded-xl overflow-hidden bg-white border border-border">
                {/* Trip card header — always visible */}
                <div
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-brand-blue/5" : ""
                  }`}
                  onClick={() => setSelectedTripIndex(isSelected ? null : idx)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <StatusBadge status={vehicle.status} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {cust?.name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-text-secondary font-mono">
                        {trip.id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-text-secondary">{trip.stops.length} stops</span>
                    {isSelected ? (
                      <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                    )}
                  </div>
                </div>

                {/* ── Expanded Trip Detail (per SOP) ── */}
                {isSelected && (
                  <div className="border-t border-border">
                    {/* Map during navigation */}
                    {showMap && currentTrip && (
                      <div className="border-b border-border">
                        <MapComponent
                          stops={currentTrip.stops}
                          vehicles={[
                            {
                              id: currentVehicle.id,
                              vehicleId: currentVehicle.vehicleId,
                              status: currentVehicle.status,
                              pax: currentVehicle.pax,
                            },
                          ]}
                          showVehicles={true}
                        />
                      </div>
                    )}

                    <div className="p-3 space-y-3">
                      {/* Trip Info Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-ops-bg rounded-lg p-2">
                          <p className="text-[9px] text-text-secondary uppercase">Scheduled</p>
                          <p className="text-xs font-medium text-text-primary mt-0.5">
                            {trip.stops[0]?.plannedTime
                              ? new Date(trip.stops[0].plannedTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </p>
                        </div>
                        <div className="bg-ops-bg rounded-lg p-2">
                          <p className="text-[9px] text-text-secondary uppercase">Vehicle Type</p>
                          <p className="text-xs font-medium text-text-primary mt-0.5 capitalize">
                            {currentVTypeName || "Sedan"}
                          </p>
                        </div>
                      </div>

                      {/* Route (Pickup → Drop) */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-success mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-success font-medium">PICKUP</p>
                            <p className="text-xs text-text-primary truncate">{pickupStop?.address || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-danger mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-danger font-medium">DROP</p>
                            <p className="text-xs text-text-primary truncate">{dropStop?.address || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Passengers */}
                      {vehicle.pax.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-text-primary flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3" /> Passengers ({vehicle.pax.length})
                          </p>
                          <div className="space-y-1">
                            {vehicle.pax.map((pax: any) => (
                              <div key={pax.id} className="flex items-center gap-2 text-[10px] bg-ops-bg px-2 py-1 rounded">
                                <UserIcon />
                                {pax.name ? <PII value={pax.name} type="name" /> : "Passenger"}
                                {pax.phone && (
                                  <>
                                    <span className="text-text-secondary">·</span>
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
                        <div className="bg-success/5 border border-success/20 rounded-lg p-2 flex justify-between items-center">
                          <span className="text-xs text-text-secondary">Fare</span>
                          <span className="text-sm font-bold text-success">₹{vehicle.lockedPrice}</span>
                        </div>
                      )}

                      {/* ═══════════ STEP-BASED ACTION BUTTONS ═══════════ */}
                      <div className="border-t border-border pt-3 space-y-2">
                        {/* STEP 1 — ASSIGNED: Accept/Reject */}
                        {vehicle.status === "ASSIGNED" && (
                          <>
                            <button
                              onClick={() => {
                                if (!currentAssignment) return;
                                const { trip, vehicle: v, vehicleIndex: vi } = currentAssignment;
                                if (v.priceId) {
                                  const offer = allOffers.find((o) => o.priceId === v.priceId);
                                  if (offer && trip.stops[0]) {
                                    const pickupTime =
                                      trip.stops[0].plannedTime || new Date().toISOString();
                                    const checkResult = checkTime(offer, pickupTime);
                                    if (!checkResult.allowBooking) {
                                      addToast(`Cannot accept: ${checkResult.reasons[0]}`, "error");
                                      return;
                                    }
                                  }
                                }
                                advance("DRIVER_ACCEPTED", "Trip accepted!");
                              }}
                              className="w-full py-2.5 bg-success text-white rounded-lg text-xs font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Accept Trip
                            </button>
                            <button
                              onClick={() => advance("DRIVER_REJECTED", "Trip rejected")}
                              className="w-full py-2 text-xs text-danger font-medium hover:bg-danger/5 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* STEP 2 — DRIVER_ACCEPTED: Start Navigation */}
                        {vehicle.status === "DRIVER_ACCEPTED" && (
                          <button
                            onClick={handleStartNavigation}
                            className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" /> Start Navigation
                          </button>
                        )}

                        {/* STEP 3 — EN_ROUTE_PICKUP: Arrived at Pickup */}
                        {vehicle.status === "EN_ROUTE_PICKUP" && (
                          <button
                            onClick={handleArriveAtPickup}
                            className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <MapPin className="w-4 h-4" /> I've Arrived
                          </button>
                        )}

                        {/* STEP 4 — AT_PICKUP: Verify OTP → Passengers Aboard */}
                        {vehicle.status === "AT_PICKUP" && (
                          <div className="space-y-2">
                            {!vehicle.otp?.pickupVerified ? (
                              <button
                                onClick={() => openOtpModal("pickup")}
                                className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                              >
                                <ShieldIcon /> Enter Pickup OTP
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="p-2 bg-success/5 border border-success/20 rounded-lg flex items-center gap-2 text-xs text-success">
                                  <CheckCircle className="w-3.5 h-3.5" /> OTP verified
                                </div>
                                <button
                                  onClick={handlePaxPicked}
                                  className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Users className="w-4 h-4" /> Passengers Aboard
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* STEP 5 — PAX_PICKED: Start Trip */}
                        {vehicle.status === "PAX_PICKED" && (
                          <button
                            onClick={handleStartTrip}
                            className="w-full py-2.5 bg-success text-white rounded-lg text-xs font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" /> Start Trip
                          </button>
                        )}

                        {/* STEP 6 — IN_TRANSIT → AT_DROP */}
                        {vehicle.status === "IN_TRANSIT" && (
                          <button
                            onClick={handleArriveAtDrop}
                            className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <MapPin className="w-4 h-4" /> Arrived at Drop
                          </button>
                        )}

                        {/* STEP 6 → 7 — AT_DROP: OTP → Drop → Complete */}
                        {vehicle.status === "AT_DROP" && (
                          <div className="space-y-2">
                            {!vehicle.otp?.dropVerified ? (
                              <button
                                onClick={() => openOtpModal("drop")}
                                className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                              >
                                <ShieldIcon /> Enter Drop OTP
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="p-2 bg-success/5 border border-success/20 rounded-lg flex items-center gap-2 text-xs text-success">
                                  <CheckCircle className="w-3.5 h-3.5" /> Drop OTP verified
                                </div>
                                <button
                                  onClick={handlePaxDropped}
                                  className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Users className="w-4 h-4" /> Drop Passengers
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PAX_DROPPED → COMPLETE */}
                        {vehicle.status === "PAX_DROPPED" && (
                          <button
                            onClick={handleCompleteTrip}
                            className="w-full py-2.5 bg-success text-white rounded-lg text-xs font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Complete Trip
                          </button>
                        )}

                        {/* SOS + Breakdown — always visible during active states */}
                        {isActive && !isComplete && vehicle.status !== "SOS" && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setShowBreakdownModal(true)}
                              className="flex-1 py-2 text-xs font-medium text-amber-700 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Breakdown
                            </button>
                            <button
                              onClick={() => setShowSosConfirm(true)}
                              className="flex-1 py-2 text-xs font-medium text-danger bg-danger/5 border border-danger/20 rounded-lg hover:bg-danger/10 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> SOS Emergency
                            </button>
                          </div>
                        )}

                        {/* Terminal States */}
                        {vehicle.status === "BREAKDOWN" && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs font-medium text-amber-800">
                              ⚠️ Breakdown: {vehicle.breakdownReason || "Unknown"}
                            </p>
                            <p className="text-[10px] text-amber-600 mt-0.5">
                              Dispatch notified — vehicle swap in progress.
                            </p>
                          </div>
                        )}
                        {vehicle.status === "SOS" && (
                          <div className="p-2.5 bg-danger/5 border border-danger/20 rounded-lg">
                            <p className="text-xs font-medium text-danger flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Emergency Reported
                            </p>
                            <p className="text-[10px] text-danger/70 mt-0.5">
                              Help is on the way. Stay where you are.
                            </p>
                          </div>
                        )}
                        {vehicle.status === "COMPLETED" && (
                          <div className="p-3 bg-success/5 border border-success/20 rounded-lg text-center">
                            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
                            <p className="text-sm font-semibold text-success">Trip Completed</p>
                            <p className="text-[10px] text-success/70 mt-0.5">
                              Thank you! Stay safe on the road.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════ OTP MODAL ═══════════ */}
      <Modal
        open={showOtpModal}
        onClose={() => { if (!otpBlocked) setShowOtpModal(false); }}
        title={`Verify ${otpPhase === "pickup" ? "Pickup" : "Drop"} OTP`}
      >
        <div className="space-y-4">
          {otpBlocked ? (
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-medium text-danger">OTP Blocked</p>
              <p className="text-xs text-danger/70 mt-1">
                Too many incorrect attempts. Dispatcher has been notified.
              </p>
              <button
                onClick={() => setShowOtpModal(false)}
                className="mt-3 px-4 py-2 bg-danger text-white text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Ask the passenger for the {otpPhase === "pickup" ? "pickup" : "drop"} OTP code.
              </p>
              {otpRemaining !== null && otpRemaining < 3 && (
                <div className={`p-2 rounded-lg text-xs text-center ${
                  otpRemaining <= 1
                    ? "bg-danger/5 text-danger border border-danger/20"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {otpRemaining} attempt(s) remaining before lockout
                </div>
              )}
              <input
                placeholder="Enter 4-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                type="text"
                inputMode="numeric"
                className="w-full px-3 py-3 text-center text-2xl tracking-[0.3em] bg-ops-bg border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                autoFocus
              />
              <button
                onClick={handleVerifyOtp}
                disabled={otpInput.length < 4}
                className="w-full py-2.5 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Verify OTP
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* ═══════════ BREAKDOWN MODAL ═══════════ */}
      <Modal open={showBreakdownModal} onClose={() => setShowBreakdownModal(false)} title="Report Breakdown">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">What type of breakdown are you experiencing?</p>
          {BREAKDOWN_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => handleBreakdown(reason)}
              className="w-full p-3 text-left bg-ops-bg hover:bg-amber-50 border border-border hover:border-amber-300 rounded-lg text-sm font-medium text-text-primary transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {reason}
            </button>
          ))}
        </div>
      </Modal>

      {/* ═══════════ SOS CONFIRM MODAL ═══════════ */}
      <Modal open={showSosConfirm} onClose={() => setShowSosConfirm(false)} title="Confirm Emergency">
        <div className="space-y-4">
          <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg text-center">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Send SOS Emergency?</p>
            <p className="text-xs text-danger/70 mt-1">
              This will alert dispatch and all emergency contacts immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleEmergency}
              className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 transition-colors"
            >
              Send SOS
            </button>
            <button
              onClick={() => setShowSosConfirm(false)}
              className="flex-1 py-2.5 border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-ops-bg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Legend (full mode only) ── */}
      {!compact && (
        <div className="bg-white border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">📋 Driver Flow (SOP)</h3>
          <div className="space-y-1.5 text-[10px] text-text-secondary">
            <p>1️⃣ <strong>ASSIGNED</strong> → Accept / Reject trip</p>
            <p>2️⃣ <strong>DRIVER_ACCEPTED</strong> → Start Navigation (map + GPS)</p>
            <p>3️⃣ <strong>EN_ROUTE_PICKUP</strong> → I've Arrived</p>
            <p>4️⃣ <strong>AT_PICKUP</strong> → OTP verify (hard gate, max 3 attempts)</p>
            <p>5️⃣ <strong>PAX_PICKED</strong> → Start Trip → <strong>IN_TRANSIT</strong> (GPS every 5s)</p>
            <p>6️⃣ <strong>IN_TRANSIT</strong> → Arrived at Drop</p>
            <p>7️⃣ <strong>AT_DROP</strong> → OTP verify → Drop → Complete</p>
            <p>🚨 <strong>SOS</strong> → Emergency (confirm dialog)</p>
            <p>⚠️ <strong>BREAKDOWN</strong> → Report with reason (Tyre/Engine/Accident/Other)</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline icon components (avoids importing from lucide for simple shapes)
function UserIcon() {
  return (
    <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

DriverApp.displayName = "DriverApp";
