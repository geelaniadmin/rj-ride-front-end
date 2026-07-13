"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useDriverStore } from "@/stores/driverStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTenantStore, useAlertStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { usePassengerStore } from "@/stores/passengerStore";
import { getTraccarSimulator, getETA } from "@/lib/mock/traccar";
import { PII } from "@/components/ui/PII";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";
import {
  Navigation,
  AlertCircle,
  CheckCircle,
  Clock,
  Smartphone,
  Car,
  User,
  History,
  LogOut,
  ChevronRight,
  Star,
  Bell,
} from "lucide-react";

const MapComponent = dynamic(() => import("@/components/trips/MapComponent"), { ssr: false });

type Tab = "active" | "history" | "profile";

interface PassengerDashboardProps {
  compact?: boolean;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({ compact = false }) => {
  // ── All hooks at the top level ──
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId), [allTrips, activeTenantId]);
  const advanceVehicleStatus = useTripStore((s) => s.advanceVehicleStatus);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const allVehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const addToast = useToastStore((s) => s.addToast);
  const addAlert = useAlertStore((s) => s.addAlert);
  const addNotification = useAlertStore((s) => s.addNotification);
  const traccar = useMemo(() => getTraccarSimulator(), []);

  const pax = usePassengerStore((s) => s.pax);
  const logout = usePassengerStore((s) => s.logout);
  const DEMO_PAX_ID = pax?.id || "NONE";

  const [tab, setTab] = useState<Tab>("active");
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLng, setVehicleLng] = useState<number | null>(null);

  // ── Find trips ──────────────────────────────────────────────────────
  const myTrips = useMemo(() => {
    const found: Array<{ tripId: string; vehicleIndex: number; trip: any; vehicle: any }> = [];
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle: any, idx: number) => {
        if (vehicle.pax?.some((p: any) => p.id === DEMO_PAX_ID)) {
          found.push({ tripId: trip.id, vehicleIndex: idx, trip, vehicle });
        }
      });
    });
    return found;
  }, [trips, DEMO_PAX_ID]);

  const currentAssignment = myTrips[0] || null;
  const currentTrip = currentAssignment?.trip;
  const currentVehicle = currentAssignment?.vehicle;
  const driver = currentVehicle?.driverId ? allDrivers.find((d) => d.id === currentVehicle.driverId) : null;
  const vehicleMeta = currentVehicle?.vehicleId ? allVehicles.find((v) => v.id === currentVehicle.vehicleId) : null;
  const vTypeName = vehicleMeta?.vehicleTypeId ? allVehicleTypes.find((vt) => vt.id === vehicleMeta.vehicleTypeId)?.name : null;
  const pickupStop = currentTrip?.stops?.[0];
  const dropStop = currentTrip?.stops?.[currentTrip?.stops?.length - 1];
  const status = currentVehicle?.status || "PENDING";
  const isActive = ["DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP", "VEHICLE_SWAP"].includes(status);
  const isComplete = ["COMPLETED"].includes(status);
  const pickupOtp = currentVehicle?.otp?.pickup || "1234";
  const dropOtp = currentVehicle?.otp?.drop || "5678";
  const showPickupOtp = ["ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "VEHICLE_SWAP"].includes(status) && !!currentVehicle?.otp?.pickup;
  const showDropOtp = status === "AT_DROP" && currentVehicle?.otp?.drop;

  // ── Status transition notifications ────────────────────────────────
  const prevStatusRef = useRef(status);
  useEffect(() => {
    // DRIVER_ACCEPTED — driver assigned and on the way
    if (prevStatusRef.current !== "DRIVER_ACCEPTED" && status === "DRIVER_ACCEPTED" && driver) {
      const firstName = driver.name.split(" ")[0];
      const vehicleInfo = vehicleMeta ? `${vehicleMeta.make} ${vehicleMeta.model} (${vehicleMeta.registrationNo})` : "";
      addToast(`🚗 ${firstName} has been assigned — heading your way!`, "success");
      addNotification({
        vendorId: currentVehicle?.vendorId || "",
        type: "TRIP_ACCEPTED",
        title: "Driver Assigned",
        message: `${driver.name} is on the way to pick you up.${vehicleInfo ? ` Vehicle: ${vehicleInfo}` : ""}`,
        tripId: currentAssignment?.tripId || "",
        read: false,
      });
    }
    // AT_PICKUP — driver has arrived
    if (prevStatusRef.current !== "AT_PICKUP" && status === "AT_PICKUP" && driver) {
      addToast(`🚗 ${driver.name.split(" ")[0]} has arrived!`, "success");
    }
    // COMPLETED
    if (prevStatusRef.current !== "COMPLETED" && status === "COMPLETED") {
      addToast("You have arrived — have a great day!", "success");
    }
    prevStatusRef.current = status;
  }, [status, driver, vehicleMeta, currentVehicle, currentAssignment]);

  // ── Completed trips for history ─────────────────────────────────────
  const completedTrips = useMemo(() => {
    return myTrips
      .filter((a) => a.vehicle.status === "COMPLETED")
      .slice(0, 10);
  }, [myTrips]);

  // ── Name for display ──
  const paxName = pax?.name || "Passenger";
  const paxPhone = pax?.phone || "";

  // ── GPS / ETA simulation ────────────────────────────────────────────
  const etaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentVehicle?.vehicleId || !pickupStop) return;
    const deviceId = currentVehicle.vehicleId;

    if (currentTrip) {
      traccar.updateVehicleStatus(deviceId, status, currentTrip.stops);
    }

    const updateEta = () => {
      const pos = traccar.getPosition(deviceId);
      if (pos && ["EN_ROUTE_PICKUP", "IN_TRANSIT"].includes(status)) {
        setVehicleLat(pos.lat);
        setVehicleLng(pos.lng);
        const targetStop = status === "IN_TRANSIT" ? dropStop : pickupStop;
        if (targetStop) {
          const etaMin = getETA(pos.lat, pos.lng, targetStop.lat, targetStop.lng);
          setEta(etaMin);
        }
      } else if (status === "AT_PICKUP" || status === "AT_DROP") {
        setEta(0);
      }
    };

    updateEta();
    etaIntervalRef.current = setInterval(updateEta, 2000);

    return () => {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    };
  }, [status, currentVehicle?.vehicleId, currentTrip?.id]);

  // ── Logout ──────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    logout();
    addToast("Logged out successfully", "success");
  }, [logout, addToast]);

  // ── SOS ─────────────────────────────────────────────────────────────
  const handleSos = useCallback(() => {
    if (!currentAssignment) return;
    advanceVehicleStatus(currentAssignment.tripId, currentAssignment.vehicleIndex, "SOS");
    addAlert({
      tenantId: currentTrip?.tenantId || activeTenantId || "",
      type: "SOS_RAISED",
      severity: "critical",
      message: `🚨 Passenger SOS raised on trip ${currentAssignment.tripId.slice(0, 8)}`,
      tripId: currentAssignment.tripId,
      vendorId: currentAssignment.vehicle.vendorId || "",
      read: false,
    });
    addToast("🚨 SOS sent! Help is on the way.", "error");
    setShowSosConfirm(false);
  }, [currentAssignment, currentTrip, activeTenantId, advanceVehicleStatus, addAlert, addToast]);

  // ── Initials helpers ────────────────────────────────────────────────
  const driverInitials = driver?.name
    ? driver.name.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
    : "DR";
  const passengerInitials = paxName
    ? paxName.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
    : "PX";

  // ── Status strip text ───────────────────────────────────────────────
  const statusTextMap: Record<string, string> = {
    SOS: "🚨 Emergency — help is on the way",
    ASSIGNED: "Finding a driver...",
    DRIVER_REJECTED: "Finding another driver...",
    DRIVER_ACCEPTED: "Driver assigned — heading your way",
    EN_ROUTE_PICKUP: `Driver en route — ${pickupStop?.address?.split(",")[0] || "pickup"}`,
    AT_PICKUP: `Driver has arrived at ${pickupStop?.address?.split(",")[0] || "pickup"}`,
    PAX_PICKED: `Trip in progress — en route to ${dropStop?.address?.split(",")[0] || "destination"}`,
    IN_TRANSIT: `Trip in progress — en route to ${dropStop?.address?.split(",")[0] || "destination"}`,
    AT_DROP: `Arriving at ${dropStop?.address?.split(",")[0] || "destination"}`,
    PAX_DROPPED: "Completing trip...",
    COMPLETED: `Trip completed — ${dropStop?.address?.split(",")[0] || "destination"} ✓`,
    BREAKDOWN: "⚠️ Vehicle change in progress",
    VEHICLE_SWAP: "🔄 New vehicle assigned — driver is on the way",
  };
  const statusText = statusTextMap[status] || status.replace(/_/g, " ");

  // ── Status strip color ──────────────────────────────────────────────
  const stripColor =
    status === "SOS" ? "bg-danger" :
    status === "COMPLETED" ? "bg-success" :
    status === "BREAKDOWN" || status === "VEHICLE_SWAP" ? "bg-amber-500" :
    isActive ? "bg-emerald-600" : "bg-amber-500";

  const showMap = currentTrip && isActive;
  const canShowSos = !isComplete && status !== "SOS" && currentAssignment;

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: ACTIVE TRIP
  // ═════════════════════════════════════════════════════════════════════
  const renderActiveTrip = () => {
    if (!currentAssignment) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Smartphone className="w-12 h-12 text-text-secondary/40 mb-3" />
          <p className="text-sm font-medium text-text-primary">No active trips</p>
          <p className="text-[11px] text-text-secondary mt-1 max-w-[200px]">
            Your trips will appear here once your employer books one for you.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* ── Status Strip ── */}
        <div className={`${stripColor} px-3 py-2.5 flex items-center gap-2`}>
          {status === "COMPLETED" ? <CheckCircle className="w-4 h-4 text-white shrink-0" /> :
           status === "SOS" ? <AlertCircle className="w-4 h-4 text-white shrink-0" /> :
           isActive ? <Navigation className="w-4 h-4 text-white shrink-0" /> :
           <Clock className="w-4 h-4 text-white shrink-0" />}
          <span className="text-xs font-medium text-white">{statusText}</span>
        </div>

        {/* ── OSM Map ── */}
        {showMap && (
          <div className="h-40 border-b border-border relative">
            <MapComponent
              stops={currentTrip.stops}
              vehicles={[
                {
                  id: currentVehicle.id,
                  vehicleId: currentVehicle.vehicleId,
                  status: currentVehicle.status,
                  pax: currentVehicle.pax,
                  lat: vehicleLat ?? undefined,
                  lng: vehicleLng ?? undefined,
                  eta: eta ?? undefined,
                },
              ]}
              showVehicles={true}
            />
            {eta !== null && eta > 0 && (
              <div className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-blue" />
                <div className="text-right">
                  <span className="text-lg font-bold text-text-primary leading-none">{eta}</span>
                  <span className="text-[9px] text-text-secondary block leading-tight">min away</span>
                </div>
              </div>
            )}
            {eta === 0 && !isComplete && (
              <div className="absolute top-2 right-2 bg-emerald-500/90 backdrop-blur rounded-xl px-3 py-1.5 shadow-lg">
                <span className="text-xs font-semibold text-white">Arrived</span>
              </div>
            )}
          </div>
        )}

        {/* ── Driver Card ── */}
        {(driver || vehicleMeta) && (
          <div className="px-3 py-3 bg-white border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-sm font-bold text-brand-blue shrink-0">
                {driverInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {driver ? <PII value={driver.name} type="name" /> : "Assigning driver..."}
                  </span>
                  {driver?.rating && (
                    <span className="text-[11px] text-amber-500 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-current" /> {driver.rating}
                    </span>
                  )}
                </div>
                {vehicleMeta && (
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                    <Car className="w-3 h-3" />
                    <span>{vTypeName || "Vehicle"} · </span>
                    <span className="font-mono">{vehicleMeta.registrationNo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── OTP Card (pulsing, dark gradient) ── */}
        {showPickupOtp && (
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 px-4 py-4">
            <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-none animate-pulse" />
            <div className="relative z-10 text-center">
              <p className="text-[11px] text-white/70 mb-2">Show this code to your driver to board</p>
              <p className="text-4xl font-bold tracking-[0.25em] text-white font-mono">
                {pickupOtp.split("").map((d: string, i: number) => (
                  <span key={i} className="inline-block mx-0.5">{d}</span>
                ))}
              </p>
              <p className="text-[10px] text-white/50 mt-2">Your driver will ask for this code</p>
            </div>
          </div>
        )}

        {/* ── Drop OTP Card ── */}
        {showDropOtp && (
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 px-4 py-4">
            <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-none animate-pulse" />
            <div className="relative z-10 text-center">
              <p className="text-[11px] text-white/70 mb-2">Show this to your driver on arrival</p>
              <p className="text-4xl font-bold tracking-[0.25em] text-white font-mono">
                {dropOtp.split("").map((d: string, i: number) => (
                  <span key={i} className="inline-block mx-0.5">{d}</span>
                ))}
              </p>
              <p className="text-[10px] text-white/50 mt-2">Different from your pickup code</p>
            </div>
          </div>
        )}

        {/* ── Completed Card ── */}
        {status === "COMPLETED" && (
          <div className="px-3 py-5 bg-white text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-bold text-text-primary">You have arrived</p>
            <p className="text-[11px] text-text-secondary">Have a great day!</p>
            <div className="bg-ops-bg rounded-xl p-3 text-left space-y-1.5 mt-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-text-primary">{pickupStop?.address || "—"}</p>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-border ml-1 h-3" />
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-danger mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-text-primary">{dropStop?.address || "—"}</p>
                </div>
              </div>
            </div>
            {driver && (
              <p className="text-[11px] text-text-secondary">
                Driver: <PII value={driver.name} type="name" />
              </p>
            )}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[11px] text-emerald-700 font-medium">Amount paid: ₹0.00</p>
              <p className="text-[10px] text-emerald-500">Your company has covered this trip</p>
            </div>
          </div>
        )}

        {/* ── Breakdown / Vehicle Swap notification ── */}
        {(status === "BREAKDOWN" || status === "VEHICLE_SWAP") && (
          <div className="px-3 py-3 bg-amber-50 border-b border-amber-200 space-y-1.5">
            <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Your vehicle has changed
            </p>
            <p className="text-[10px] text-amber-600">
              Same trip ID — no rebooking needed. Your new driver is on the way.
            </p>
            {(driver || vehicleMeta) && (
              <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-amber-200">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-bold text-amber-700 shrink-0">
                  {driver?.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2) || "DR"}
                </div>
                <div className="text-[10px] text-amber-700">
                  <span className="font-medium">
                    {driver ? driver.name.split(" ")[0] : "New driver"} is on the way
                  </span>
                  {vehicleMeta && (
                    <span className="block text-[9px] text-amber-500">
                      {vehicleMeta.make} {vehicleMeta.model} · {vehicleMeta.registrationNo}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SOS Active ── */}
        {status === "SOS" && (
          <div className="px-3 py-4 bg-danger/5 border-b border-danger/20 text-center">
            <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Help is on the way</p>
            <p className="text-[11px] text-danger/70 mt-0.5">Emergency team has been alerted</p>
          </div>
        )}

        <div className="px-3 py-3">
          {canShowSos && (
            <button
              onClick={() => setShowSosConfirm(true)}
              className="w-full py-3 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-danger/20"
            >
              <AlertCircle className="w-5 h-5" /> Emergency (SOS)
            </button>
          )}
        </div>
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: HISTORY
  // ═════════════════════════════════════════════════════════════════════
  const renderHistory = () => {
    if (completedTrips.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <History className="w-10 h-10 text-text-secondary/40 mb-3" />
          <p className="text-sm font-medium text-text-primary">No trip history</p>
          <p className="text-[11px] text-text-secondary mt-1">Your completed trips will appear here.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-3">
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Recent Trips ({completedTrips.length})
        </p>
        {completedTrips.map((assignment, idx) => {
          const { trip, vehicle } = assignment;
          const d = trip?.stops?.[0]?.plannedTime ? new Date(trip.stops[0].plannedTime) : null;
          const tDriver = vehicle?.driverId ? allDrivers.find((dr) => dr.id === vehicle.driverId) : null;
          return (
            <div key={idx} className="bg-white border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="green">COMPLETED</Badge>
                <span className="text-[10px] text-text-secondary">
                  {d ? d.toLocaleDateString() : "—"} · {d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                <span className="text-[11px] text-text-primary">{trip?.stops?.[0]?.address?.split(",")[0] || "—"}</span>
              </div>
              <div className="border-l border-dashed border-border ml-0.5 h-2" />
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                <span className="text-[11px] text-text-primary">{trip?.stops?.[trip.stops.length - 1]?.address?.split(",")[0] || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-secondary pt-1 border-t border-border">
                {tDriver && <span>Driver: <PII value={tDriver.name} type="name" /></span>}
                <span className="text-[10px] text-text-secondary">{vTypeName || "Vehicle"}</span>
                <span className="text-emerald-600 font-medium">₹0.00</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER: PROFILE
  // ═════════════════════════════════════════════════════════════════════
  const renderProfile = () => {
    return (
      <div className="space-y-3 p-3">
        <div className="flex flex-col items-center py-4">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-2xl font-bold text-brand-blue mb-2">
            {passengerInitials}
          </div>
          <p className="text-sm font-semibold text-text-primary">Passenger</p>
          <p className="text-[10px] text-text-secondary mt-0.5">ID: {pax?.id || "—"}</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-3">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Name</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-mono text-text-primary font-medium">
              <PII value={paxName} type="name" />
            </span>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Phone</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-mono text-text-primary font-medium">
              <PII value={paxPhone} type="phone" />
            </span>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Language</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-text-primary font-medium">English</span>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-primary font-medium">Notifications</span>
          </div>
          <div className="w-9 h-5 rounded-full bg-success relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 right-0.5 shadow" />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 text-sm text-danger font-medium border border-danger/20 rounded-xl hover:bg-danger/5 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>

        <p className="text-[10px] text-text-secondary text-center">Version 0.1.0 · RIDE Passenger</p>
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col bg-[#F4F5F7]">
      {/* Tab Bar */}
      <div className="flex bg-white border-b border-border shrink-0">
        {[
          { key: "active" as Tab, label: "Active Trip", icon: Navigation },
          { key: "history" as Tab, label: "History", icon: History },
          { key: "profile" as Tab, label: "Profile", icon: User },
        ].map((t) => {
          const Icon = t.icon;
          const isActiveTab = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActiveTab
                  ? "text-brand-blue border-b-2 border-brand-blue"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === "active" && renderActiveTrip()}
        {tab === "history" && renderHistory()}
        {tab === "profile" && renderProfile()}
      </div>

      <Modal open={showSosConfirm} onClose={() => setShowSosConfirm(false)} title="Confirm Emergency">
        <div className="space-y-4">
          <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg text-center">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Trigger emergency alert?</p>
            <p className="text-xs text-danger/70 mt-1">
              Dispatch will be notified immediately. Emergency services will be alerted.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSos}
              className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 transition-colors"
            >
              Confirm SOS
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
    </div>
  );
};

PassengerDashboard.displayName = "PassengerDashboard";
