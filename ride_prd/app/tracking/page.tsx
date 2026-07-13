"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useTripStore } from "@/stores/tripStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { useCustomerStore } from "@ride/shared";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PII } from "@/components/ui/PII";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TripMapView } from "@/components/trips/TripMapView";
import { VehicleStatus } from "@/lib/types";
import { getTraccarSimulator, getETA } from "@/lib/mock/traccar";
import { startAnomalyDetectionLoop } from "@/lib/anomalyDetector";
import { useAnomalyStore } from "@/stores/anomalyStore";
import { Users, Navigation, AlertCircle, Phone, MapPin, Lock, AlertTriangle, MapIcon, Shield } from "lucide-react";

const DEMO_DRIVER_ID = "D1";

export default function TrackingPage() {
  const language = useLanguageStore((s) => s.language);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(
    () => allTrips.filter((t) => t.tenantId === activeTenantId && ["ASSIGNED", "IN_PROGRESS"].includes(t.status)),
    [allTrips, activeTenantId]
  );
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const vehicles = useMemo(() => allVehicles.filter((v) => v.tenantId === activeTenantId), [allVehicles, activeTenantId]);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const drivers = useMemo(() => allDrivers.filter((d) => d.tenantId === activeTenantId), [allDrivers, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const updateTrip = useTripStore((s) => s.updateTrip);
  const addToast = useToastStore((s) => s.addToast);

  // ── Anomaly Detection ──
  const anomalyEvents = useAnomalyStore((s) => s.events);
  const config = useAnomalyStore((s) => s.config);
  const updateConfig = useAnomalyStore((s) => s.updateConfig);
  const resolveEvent = useAnomalyStore((s) => s.resolveEvent);
  const activeAnomalies = useMemo(() => anomalyEvents.filter((e) => !e.resolved), [anomalyEvents]);

  // Start anomaly detection loop
  useEffect(() => {
    const cleanup = startAnomalyDetectionLoop(activeTenantId);
    return cleanup;
  }, [activeTenantId]);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showDriverApp, setShowDriverApp] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [otpModal, setOtpModal] = useState<{ open: boolean; phase: "pickup" | "drop"; tripId: string; vehicleIndex: number } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const traccar = getTraccarSimulator();

  // Initialize Traccar with trip vehicles
  useEffect(() => {
    const traccarVehicles = trips.flatMap((trip) =>
      trip.vehicles.map((vehicle, idx) => ({
        tripId: trip.id,
        vehicleIndex: idx,
        vehicleId: vehicle.vehicleId,
        status: vehicle.status as VehicleStatus,
        stops: trip.stops,
      }))
    );
    traccar.setTripVehicles(traccarVehicles);
  }, [trips, traccar]);

  // Update vehicle positions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const tripsMap = new Map(trips.map((t) => [t.id, t.stops]));
      traccar.updatePositions(tripsMap);
    }, 1000);
    return () => clearInterval(interval);
  }, [trips, traccar]);

  // Build active trips with vehicle/driver info
  const activeTrips = useMemo(() => {
    const items: any[] = [];
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle, idx) => {
        const fleetVehicle = vehicle.vehicleId ? vehicles.find((v) => v.id === vehicle.vehicleId) : null;
        const driver = vehicle.driverId ? drivers.find((d) => d.id === vehicle.driverId) : null;
        const customer = customers.find((c) => c.id === trip.customerId);
        const traccarPos = vehicle.vehicleId ? traccar.getPosition(vehicle.vehicleId) : null;
        const nextStop = trip.stops[1];
        const eta = traccarPos && nextStop ? getETA(traccarPos.lat, traccarPos.lng, nextStop.lat, nextStop.lng) : null;

        items.push({
          tripId: trip.id,
          vehicleIndex: idx,
          trip,
          vehicle,
          fleetVehicle,
          driver,
          customer,
          traccarPos,
          eta,
          isActive: ["EN_ROUTE_PICKUP", "AT_PICKUP", "IN_TRANSIT", "AT_DROP"].includes(vehicle.status),
        });
      });
    });
    return items.sort((a, b) => (b.isActive ? 1 : -1));
  }, [trips, vehicles, drivers, customers, traccar]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const currentDriver = drivers.find((d) => d.id === DEMO_DRIVER_ID);
  const demoAssignedTrips = useMemo(() => {
    const assigned: any[] = [];
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle, idx) => {
        if (vehicle.driverId === DEMO_DRIVER_ID) {
          assigned.push({
            tripId: trip.id,
            vehicleIndex: idx,
            trip,
            vehicle,
            traccarPos: vehicle.vehicleId ? traccar.getPosition(vehicle.vehicleId) : null,
          });
        }
      });
    });
    return assigned;
  }, [trips, traccar]);

  const activeCount = activeTrips.filter((a) => a.isActive).length;
  const sosCount = activeTrips.filter((a) => a.vehicle.status === "SOS").length;

  const handleLocationSharingToggle = () => {
    const demoDriver = allDrivers.find((d) => d.id === DEMO_DRIVER_ID);
    if (!demoDriver) return;

    // Find first vehicle assigned to demo driver
    const assignedVehicle = demoAssignedTrips[0];
    if (!assignedVehicle?.vehicle.vehicleId) return;

    if (locationSharing) {
      traccar.disableLocationSharing(assignedVehicle.vehicle.vehicleId);
    } else {
      traccar.enableLocationSharing(assignedVehicle.vehicle.vehicleId);
    }
    setLocationSharing(!locationSharing);
    addToast(
      t("locationSharingToggled", language).replace("{enabled}", !locationSharing ? t("enabled", language) : t("disabled", language)),
      "info"
    );
  };

  const handleVerifyOTP = () => {
    if (!otpModal || !otpInput) {
      addToast(t("enterOtpToVerify", language), "error");
      return;
    }

    const { tripId, vehicleIndex, phase } = otpModal;
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const vehicle = trip.vehicles[vehicleIndex];
    const nextStatus = phase === "pickup" ? "PAX_PICKED" : "PAX_DROPPED";

    // Update vehicle with verified OTP
    const updatedVehicles = trip.vehicles.map((v, i) =>
      i === vehicleIndex
        ? {
            ...v,
            status: nextStatus as VehicleStatus,
            otp: {
              ...(v.otp || {}),
              [phase === "pickup" ? "pickupVerified" : "dropVerified"]: true,
            },
          }
        : v
    );

    updateTrip(tripId, { vehicles: updatedVehicles });
    addToast(
      t("otpVerified", language).replace("{phase}", phase === "pickup" ? t("pickup", language) : t("drop", language)),
      "success"
    );
    setOtpModal(null);
    setOtpInput("");
  };

  const handleSOS = (tripId: string, vehicleIndex: number) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const updatedVehicles = trip.vehicles.map((v, i) =>
      i === vehicleIndex ? { ...v, status: "SOS" as VehicleStatus } : v
    );

    updateTrip(tripId, { vehicles: updatedVehicles });
    addToast(t("sosAlertRaised", language), "error");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("liveTracking", language)}</h1>
          <p className="text-sm text-text-secondary mt-1">{t("trackingDescription", language)}</p>
        </div>
        <Badge variant="blue" className="flex items-center gap-1">
          <MapIcon className="w-3 h-3" />
          {t("traccarSelfHostedMock", language)}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">{t("activeTrips", language)}</p>
            <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">{t("assigned", language)}</p>
            <p className="text-2xl font-bold text-white mt-1">{activeTrips.filter((a) => a.vehicle.status === "ASSIGNED").length}</p>
          </div>
        </div>
        <div className={`${sosCount > 0 ? "bg-danger border-danger" : "bg-ops-sidebar border-ops-sidebar"} rounded-xl shadow-lg p-4 border`}>
          <div>
            <p className={`text-xs ${sosCount > 0 ? "text-white" : "text-white/60"}`}>{t("emergencies", language)}</p>
            <p className={`text-2xl font-bold mt-1 ${sosCount > 0 ? "text-white" : "text-white"}`}>{sosCount}</p>
          </div>
        </div>
      </div>

      {/* ── Anomaly Detection Panel ── */}
      <div className="bg-gradient-to-r from-amber-500/5 to-red-500/5 border border-amber-200/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-text-primary">{t("anomalyDetection", language)}</h3>
            <Badge variant={config.enabled ? "green" : "amber"} className="text-[9px]">
              {config.enabled ? t("active", language) : t("paused", language)}
            </Badge>
            {activeAnomalies.length > 0 && (
              <Badge variant="red" className="text-[9px]">
                {activeAnomalies.length} {t("active", language)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                config.enabled
                  ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                  : "border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {config.enabled ? t("pause", language) : t("resume", language)}
            </button>
          </div>
        </div>

        {/* Config sliders (compact) */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-text-secondary mb-1">{t("deviationKm", language).replace("{km}", String(config.deviationThresholdKm))}</p>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={config.deviationThresholdKm}
              onChange={(e) => updateConfig({ deviationThresholdKm: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer"
            />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary mb-1">{t("prolongedStopMin", language).replace("{min}", String(config.prolongedStopMinutes))}</p>
            <input
              type="range"
              min={2}
              max={30}
              step={1}
              value={config.prolongedStopMinutes}
              onChange={(e) => updateConfig({ prolongedStopMinutes: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer"
            />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary mb-1">{t("noShowMin", language).replace("{min}", String(config.noShowMinutes))}</p>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={config.noShowMinutes}
              onChange={(e) => updateConfig({ noShowMinutes: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer"
            />
          </div>
        </div>

        {/* Active anomalies */}
        {activeAnomalies.length > 0 && (
          <div className="space-y-1.5 mt-2 pt-2 border-t border-border">
            <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">{t("activeAnomalies", language)}</p>
            {activeAnomalies.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                  event.severity === "CRITICAL" || event.severity === "HIGH"
                    ? "bg-danger/5 border border-danger/20"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className={`w-3 h-3 shrink-0 ${
                    event.severity === "CRITICAL" || event.severity === "HIGH"
                      ? "text-danger" : "text-amber-500"
                  }`} />
                  <span className="text-text-primary">{event.message}</span>
                </div>
                <button
                  onClick={() => resolveEvent(event.id)}
                  className="shrink-0 text-text-secondary hover:text-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            {activeAnomalies.length > 5 && (
              <p className="text-[10px] text-text-secondary text-center">
                +{activeAnomalies.length - 5} {t("moreAnomalies", language)}
              </p>
            )}
          </div>
        )}

        {activeAnomalies.length === 0 && config.enabled && (
          <p className="text-[11px] text-text-secondary/60 text-center py-1">
            ✓ {t("allVehiclesOnTrack", language)}
          </p>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setViewMode("map")}
          variant={viewMode === "map" ? "primary" : "secondary"}
          size="sm"
          className="flex items-center gap-1"
        >
          <MapIcon className="w-3 h-3" />
          {t("fleetMap", language)}
        </Button>
        <Button
          onClick={() => setViewMode("list")}
          variant={viewMode === "list" ? "primary" : "secondary"}
          size="sm"
        >
          {t("tripList", language)}
        </Button>
      </div>

      {/* Global Fleet Map */}
      {viewMode === "map" && !selectedTripId && (
        <>
          <Card padding="lg" header={<h3 className="font-semibold">{t("fleetMapAllVehicles", language)}</h3>}>
            <TripMapView
              stops={
                trips.length > 0
                  ? trips.flatMap((t) => t.stops).filter((s, i, arr) => arr.findIndex((a) => a.lat === s.lat && s.lng === a.lng) === i)
                  : []
              }
              vehicles={activeTrips.map((item) => ({
                id: item.tripId,
                vehicleId: item.vehicle.vehicleId,
                status: item.vehicle.status,
                pax: item.vehicle.pax,
                lat: item.traccarPos?.lat,
                lng: item.traccarPos?.lng,
                eta: item.eta,
              }))}
              showVehicles={true}
            />
          </Card>
          <Card padding="lg" header={<h3 className="font-semibold">{t("activeFleetCount", language).replace("{count}", String(activeTrips.length))}</h3>}>
            <p className="text-xs text-text-secondary mb-3">{t("clickVehicleForDetails", language)}</p>
            <div className="space-y-2">
              {activeTrips.map((item) => (
                <div
                  key={`${item.tripId}-${item.vehicleIndex}`}
                  onClick={() => setSelectedTripId(item.tripId)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedTripId(item.tripId)}
                  role="button"
                  tabIndex={0}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {item.fleetVehicle ? `${item.fleetVehicle.make} ${item.fleetVehicle.model}` : t("unassigned", language)} — {item.customer?.name}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">{t("driverWithColon", language)} {item.driver ? <PII value={item.driver.name} type="name" /> : t("unassigned", language)}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={item.vehicle.status} />
                      {item.eta && <div className="text-xs text-brand-blue mt-1">{t("etaMinutes", language).replace("{min}", String(item.eta))}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {selectedTrip ? (
        <>
          {/* Back to List + Driver App Toggle */}
          <div className="flex justify-between items-center">
            <button onClick={() => setSelectedTripId(null)} className="text-sm text-brand-blue hover:text-brand-blue/80">
              ← {t("backTo", language)} {viewMode === "map" ? t("fleetMap", language) : t("tripList", language)}
            </button>
            {demoAssignedTrips.some((t) => t.tripId === selectedTripId) && (
              <Button onClick={() => setShowDriverApp(!showDriverApp)} variant={showDriverApp ? "secondary" : "primary"} size="sm">
                {showDriverApp ? t("hide", language) : t("show", language)} {t("driverApp", language)}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Map View - spans 2 columns if driver app is hidden */}
            <div className={showDriverApp ? "col-span-2" : "col-span-3"}>
              <TripMapView stops={selectedTrip.stops} vehicles={selectedTrip.vehicles} showVehicles={true} />
            </div>

            {/* Driver App Simulator */}
            {showDriverApp && (
              <div className="col-span-1 space-y-4">
                <Card padding="lg" header={<h3 className="font-semibold text-sm">{t("driverAppHeader", language)}</h3>}>
                  {demoAssignedTrips.length === 0 ? (
                    <p className="text-xs text-text-secondary">{t("noTripsDemoDriver", language)}</p>
                  ) : (
                    demoAssignedTrips.map((assigned) => {
                      const trip = assigned.trip;
                      const vehicle = assigned.vehicle;
                      const nextStop = trip.stops[1];
                      const eta = assigned.traccarPos && nextStop ? getETA(assigned.traccarPos.lat, assigned.traccarPos.lng, nextStop.lat, nextStop.lng) : null;

                      return (
                        <div key={`${assigned.tripId}-${assigned.vehicleIndex}`} className="space-y-3">
                          <div className="p-3 bg-ops-bg rounded border border-border">
                            <p className="text-xs text-text-secondary mb-2">{t("activeTrip", language)}</p>
                            <p className="text-sm font-medium text-text-primary">{trip.stops[0]?.address || t("pickup", language)}</p>
                            <p className="text-xs text-text-secondary">→ {nextStop?.address || t("destination", language)}</p>
                            {eta && <p className="text-xs text-brand-blue mt-1">{t("etaMinutes", language).replace("{min}", String(eta))}</p>}
                          </div>

                          <div className="flex items-center gap-2 p-2 bg-brand-blue/10 border border-brand-blue/20 rounded text-xs">
                            <Navigation className="w-3 h-3 text-brand-blue" />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={locationSharing} onChange={handleLocationSharingToggle} className="w-3 h-3" />
                              <span className="text-text-primary">{t("sharingLocation", language)}</span>
                            </label>
                          </div>

                          {/* Status Actions */}
                          <div className="space-y-2">
                            {vehicle.status === "PAX_PICKED" && (
                              <Button
                                onClick={() => setOtpModal({ open: true, phase: "drop", tripId: assigned.tripId, vehicleIndex: assigned.vehicleIndex })}
                                variant="primary"
                                size="sm"
                                className="w-full text-xs"
                              >
                                <Lock className="w-3 h-3 mr-1" /> {t("verifyDropOtp", language)}
                              </Button>
                            )}
                            {vehicle.status === "EN_ROUTE_PICKUP" && (
                              <Button
                                onClick={() => setOtpModal({ open: true, phase: "pickup", tripId: assigned.tripId, vehicleIndex: assigned.vehicleIndex })}
                                variant="primary"
                                size="sm"
                                className="w-full text-xs"
                              >
                                <Lock className="w-3 h-3 mr-1" /> {t("verifyPickupOtp", language)}
                              </Button>
                            )}
                          </div>

                          <Button
                            onClick={() => handleSOS(assigned.tripId, assigned.vehicleIndex)}
                            className="w-full text-xs bg-danger hover:bg-danger text-white border-danger"
                            size="sm"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> {t("sos", language)}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Trip Details */}
          <Card padding="lg" header={<h3 className="font-semibold">{t("tripDetails", language)}</h3>}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary">{t("customer", language)}</p>
                  <p className="text-text-primary">{customers.find((c) => c.id === selectedTrip.customerId)?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">{t("status", language)}</p>
                  <StatusBadge status={selectedTrip.status} />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-text-primary mb-2">{t("vehiclesInConvoy", language)}</p>
                <div className="space-y-2">
                  {selectedTrip.vehicles.map((vehicle, idx) => {
                    const fleetVehicle = vehicle.vehicleId ? vehicles.find((v) => v.id === vehicle.vehicleId) : null;
                    const driver = vehicle.driverId ? drivers.find((d) => d.id === vehicle.driverId) : null;
                    const traccarPos = vehicle.vehicleId ? traccar.getPosition(vehicle.vehicleId) : null;
                    const nextStop = selectedTrip.stops[1];
                    const eta = traccarPos && nextStop ? getETA(traccarPos.lat, traccarPos.lng, nextStop.lat, nextStop.lng) : null;
                    const isSOS = vehicle.status === "SOS";

                    return (
                      <div
                        key={vehicle.id}
                        className={`p-3 rounded-xl border space-y-2 ${isSOS ? "bg-danger/5 border-danger/20" : "bg-white border-border"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">{t("vehicleNum", language).replace("{num}", String(idx + 1))}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={vehicle.status} />
                            {isSOS && <AlertCircle className="w-4 h-4 text-danger" />}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-text-secondary">{t("fleet", language)}</p>
                            <p className="text-text-primary">{fleetVehicle ? `${fleetVehicle.make} ${fleetVehicle.model}` : t("unassigned", language)}</p>
                          </div>
                          <div>
                            <div className="text-text-secondary">{t("driver", language)}</div>
                            <div className="text-text-primary">{driver ? <PII value={driver.name} type="name" /> : t("unassigned", language)}</div>
                          </div>
                        </div>
                        {eta && (
                          <div className="text-xs text-brand-blue font-medium">
                            <MapPin className="w-3 h-3 inline mr-1" /> {t("etaNextStop", language).replace("{min}", String(eta))}
                          </div>
                        )}
                        {vehicle.pax.length > 0 && (
                          <div className="text-xs text-text-secondary">
                            <Users className="w-3 h-3 inline mr-1" /> {vehicle.pax.length} {t("passengers", language)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <>
          {viewMode === "list" && (
            <>
              {/* Trips List */}
          <Card padding="lg" header={<h3 className="font-semibold">{t("activeTripsHeader", language).replace("{count}", String(activeTrips.length))}</h3>}>
            <div className="space-y-2">
              {activeTrips.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">{t("noActiveTrips", language)}</p>
              ) : (
                activeTrips.map((item) => {
                  const isEmergency = item.vehicle.status === "SOS";
                  const isMoving = ["EN_ROUTE_PICKUP", "IN_TRANSIT"].includes(item.vehicle.status);

                  return (
                    <div
                      key={`${item.tripId}-${item.vehicleIndex}`}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-brand-blue ${
                        isEmergency ? "bg-danger/5 border-danger/20" : isMoving ? "bg-alert-amber/5 border-alert-amber/20" : "bg-white border-border"
                      }`}
                      onClick={() => setSelectedTripId(item.tripId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.vehicle.status} />
                          <span className="text-sm font-medium text-text-primary">{item.customer?.name}</span>
                        </div>
                        {isEmergency && <AlertCircle className="w-5 h-5 text-danger" />}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs text-text-secondary">
                        <div>
                          <span className="text-text-tertiary">{t("vehicleWithColon", language)}</span> {item.fleetVehicle ? `${item.fleetVehicle.make}` : t("dash", language)}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("driverWithColon", language)}</span> {item.driver ? <PII value={item.driver.name} type="name" /> : t("dash", language)}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("paxWithColon", language)}</span> {item.vehicle.pax.length}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("etaLabel", language)}</span> {item.eta ? `${item.eta}m` : t("dash", language)}
                        </div>
                      </div>

                      {isMoving && (
                        <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {item.trip.stops[1]?.address || item.trip.stops[0]?.address}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Legend */}
          <Card padding="lg" header={<h3 className="font-semibold">{t("vehicleStatusLegend", language)}</h3>}>
            <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
              <div>
                <p className="font-medium text-text-primary mb-2">{t("moving", language)}</p>
                <p>{t("legendTrackingEnRoute", language)}</p>
                <p>{t("legendTrackingInTransit", language)}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">{t("stopped", language)}</p>
                <p>{t("legendTrackingAtPickup", language)}</p>
                <p>{t("legendTrackingAtDrop", language)}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">{t("booking", language)}</p>
                <p>{t("legendTrackingAssigned", language)}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">{t("emergency", language)}</p>
                <p>{t("legendTrackingSOS", language)}</p>
              </div>
            </div>
          </Card>
            </>
          )}
        </>
      )}

      {/* OTP Modal */}
      {otpModal && (
        <Modal open={true} onClose={() => setOtpModal(null)} title={t("verifyOtpTitle", language).replace("{phase}", otpModal.phase === "pickup" ? t("pickup", language) : t("drop", language))}>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{t("otpInstruction", language)}</p>
            <Input
              type="text"
              placeholder={t("enterOtpHint", language)}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              maxLength={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleVerifyOTP} variant="primary" className="flex-1">
                {t("verify", language)}
              </Button>
              <Button onClick={() => setOtpModal(null)} variant="secondary" className="flex-1">
                {t("cancel", language)}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
