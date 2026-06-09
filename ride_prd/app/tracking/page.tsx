"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useTenantStore } from "@/stores/tenantStore";
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
import { Users, Navigation, AlertCircle, Phone, MapPin, Lock, AlertTriangle, MapIcon } from "lucide-react";

const DEMO_DRIVER_ID = "D1";

export default function TrackingPage() {
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
    addToast(`Location sharing ${!locationSharing ? "enabled" : "disabled"}`, "info");
  };

  const handleVerifyOTP = () => {
    if (!otpModal || !otpInput) {
      addToast("Enter OTP to verify", "error");
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
    addToast(`${phase.charAt(0).toUpperCase() + phase.slice(1)} OTP verified!`, "success");
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
    addToast("🚨 SOS alert raised! Emergency assistance dispatched.", "error");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Live Tracking</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time trip monitoring and status updates</p>
        </div>
        <Badge variant="blue" className="flex items-center gap-1">
          <MapIcon className="w-3 h-3" />
          Traccar: self-hosted (mock)
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">Active Trips</p>
            <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">Assigned</p>
            <p className="text-2xl font-bold text-white mt-1">{activeTrips.filter((a) => a.vehicle.status === "ASSIGNED").length}</p>
          </div>
        </div>
        <div className={`${sosCount > 0 ? "bg-danger border-danger" : "bg-ops-sidebar border-ops-sidebar"} rounded-xl shadow-lg p-4 border`}>
          <div>
            <p className={`text-xs ${sosCount > 0 ? "text-white" : "text-white/60"}`}>Emergencies</p>
            <p className={`text-2xl font-bold mt-1 ${sosCount > 0 ? "text-white" : "text-white"}`}>{sosCount}</p>
          </div>
        </div>
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
          Fleet Map
        </Button>
        <Button
          onClick={() => setViewMode("list")}
          variant={viewMode === "list" ? "primary" : "secondary"}
          size="sm"
        >
          Trip List
        </Button>
      </div>

      {/* Global Fleet Map */}
      {viewMode === "map" && !selectedTripId && (
        <>
          <Card padding="lg" header={<h3 className="font-semibold">🌍 Fleet Map - All Active Vehicles</h3>}>
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
          <Card padding="lg" header={<h3 className="font-semibold">📍 Active Fleet ({activeTrips.length} vehicles)</h3>}>
            <p className="text-xs text-text-secondary mb-3">Click a vehicle to see its trip details</p>
            <div className="space-y-2">
              {activeTrips.map((item) => (
                <button
                  key={`${item.tripId}-${item.vehicleIndex}`}
                  onClick={() => setSelectedTripId(item.tripId)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.fleetVehicle ? `${item.fleetVehicle.make} ${item.fleetVehicle.model}` : "Unassigned"} — {item.customer?.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">Driver: {item.driver ? <PII value={item.driver.name} type="name" /> : "Unassigned"}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={item.vehicle.status} />
                      {item.eta && <p className="text-xs text-brand-blue mt-1">ETA: {item.eta}m</p>}
                    </div>
                  </div>
                </button>
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
              ← Back to {viewMode === "map" ? "Fleet Map" : "List"}
            </button>
            {demoAssignedTrips.some((t) => t.tripId === selectedTripId) && (
              <Button onClick={() => setShowDriverApp(!showDriverApp)} variant={showDriverApp ? "secondary" : "primary"} size="sm">
                {showDriverApp ? "Hide" : "Show"} Driver App
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
                <Card padding="lg" header={<h3 className="font-semibold text-sm">📱 Driver App</h3>}>
                  {demoAssignedTrips.length === 0 ? (
                    <p className="text-xs text-text-secondary">No trips assigned to demo driver</p>
                  ) : (
                    demoAssignedTrips.map((assigned) => {
                      const trip = assigned.trip;
                      const vehicle = assigned.vehicle;
                      const nextStop = trip.stops[1];
                      const eta = assigned.traccarPos && nextStop ? getETA(assigned.traccarPos.lat, assigned.traccarPos.lng, nextStop.lat, nextStop.lng) : null;

                      return (
                        <div key={`${assigned.tripId}-${assigned.vehicleIndex}`} className="space-y-3">
                          <div className="p-3 bg-ops-bg rounded border border-border">
                            <p className="text-xs text-text-secondary mb-2">Active Trip</p>
                            <p className="text-sm font-medium text-text-primary">{trip.stops[0]?.address || "Pickup"}</p>
                            <p className="text-xs text-text-secondary">→ {nextStop?.address || "Destination"}</p>
                            {eta && <p className="text-xs text-brand-blue mt-1">ETA: {eta} min</p>}
                          </div>

                          <div className="flex items-center gap-2 p-2 bg-brand-blue/10 border border-brand-blue/20 rounded text-xs">
                            <Navigation className="w-3 h-3 text-brand-blue" />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={locationSharing} onChange={handleLocationSharingToggle} className="w-3 h-3" />
                              <span className="text-text-primary">Sharing location</span>
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
                                <Lock className="w-3 h-3 mr-1" /> Verify Drop OTP
                              </Button>
                            )}
                            {vehicle.status === "EN_ROUTE_PICKUP" && (
                              <Button
                                onClick={() => setOtpModal({ open: true, phase: "pickup", tripId: assigned.tripId, vehicleIndex: assigned.vehicleIndex })}
                                variant="primary"
                                size="sm"
                                className="w-full text-xs"
                              >
                                <Lock className="w-3 h-3 mr-1" /> Verify Pickup OTP
                              </Button>
                            )}
                          </div>

                          <Button
                            onClick={() => handleSOS(assigned.tripId, assigned.vehicleIndex)}
                            className="w-full text-xs bg-danger hover:bg-danger text-white border-danger"
                            size="sm"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> SOS
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
          <Card padding="lg" header={<h3 className="font-semibold">📍 Trip Details</h3>}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary">Customer</p>
                  <p className="text-text-primary">{customers.find((c) => c.id === selectedTrip.customerId)?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Status</p>
                  <StatusBadge status={selectedTrip.status} />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-text-primary mb-2">Vehicles in Convoy:</p>
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
                          <span className="text-sm font-medium text-text-primary">Vehicle {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={vehicle.status} />
                            {isSOS && <AlertCircle className="w-4 h-4 text-danger" />}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-text-secondary">Fleet</p>
                            <p className="text-text-primary">{fleetVehicle ? `${fleetVehicle.make} ${fleetVehicle.model}` : "Unassigned"}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Driver</p>
                            <p className="text-text-primary">{driver ? <PII value={driver.name} type="name" /> : "Unassigned"}</p>
                          </div>
                        </div>
                        {eta && (
                          <div className="text-xs text-brand-blue font-medium">
                            <MapPin className="w-3 h-3 inline mr-1" /> ETA to next stop: {eta} min
                          </div>
                        )}
                        {vehicle.pax.length > 0 && (
                          <div className="text-xs text-text-secondary">
                            <Users className="w-3 h-3 inline mr-1" /> {vehicle.pax.length} passengers
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
          <Card padding="lg" header={<h3 className="font-semibold">🚗 Active Trips ({activeTrips.length})</h3>}>
            <div className="space-y-2">
              {activeTrips.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No active trips</p>
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
                          <span className="text-text-tertiary">Vehicle:</span> {item.fleetVehicle ? `${item.fleetVehicle.make}` : "—"}
                        </div>
                        <div>
                          <span className="text-text-tertiary">Driver:</span> {item.driver ? <PII value={item.driver.name} type="name" /> : "—"}
                        </div>
                        <div>
                          <span className="text-text-tertiary">Pax:</span> {item.vehicle.pax.length}
                        </div>
                        <div>
                          <span className="text-text-tertiary">ETA:</span> {item.eta ? `${item.eta}m` : "—"}
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
          <Card padding="lg" header={<h3 className="font-semibold">📋 Vehicle Status Legend</h3>}>
            <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
              <div>
                <p className="font-medium text-text-primary mb-2">Moving</p>
                <p>🚗 EN_ROUTE_PICKUP — Going to pickup</p>
                <p>🚕 IN_TRANSIT — Moving to drop</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">Stopped</p>
                <p>📍 AT_PICKUP — At pickup location</p>
                <p>📍 AT_DROP — At drop location</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">Booking</p>
                <p>📋 ASSIGNED — Waiting for driver</p>
              </div>
              <div>
                <p className="font-medium text-text-primary mb-2">Emergency</p>
                <p>🚨 SOS — Immediate assistance</p>
              </div>
            </div>
          </Card>
            </>
          )}
        </>
      )}

      {/* OTP Modal */}
      {otpModal && (
        <Modal open={true} onClose={() => setOtpModal(null)} title={`Verify ${otpModal.phase.charAt(0).toUpperCase() + otpModal.phase.slice(1)} OTP`}>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Enter the OTP shared with passengers to verify.</p>
            <Input
              type="text"
              placeholder="Enter OTP (hint: 1234)"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              maxLength={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleVerifyOTP} variant="primary" className="flex-1">
                Verify
              </Button>
              <Button onClick={() => setOtpModal(null)} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
