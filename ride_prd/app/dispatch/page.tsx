"use client";

import React, { useMemo, useState } from "react";
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
import { TripStatus, VehicleStatus } from "@/lib/types";
import { getNextValidTransitions, getStatusDescription } from "@/lib/lifecycle";
import { MapPin, AlertCircle, ChevronRight, Lock, X, AlertTriangle } from "lucide-react";

const DISPATCH_STATUSES: VehicleStatus[] = ["ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP", "PAX_DROPPED"];

export default function DispatchPage() {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId && t.status !== "CANCELLED"), [allTrips, activeTenantId]);
  const getDerivedTripStatus = useTripStore((s) => s.getDerivedTripStatus);
  const advanceVehicleStatus = useTripStore((s) => s.advanceVehicleStatus);
  const cancelVehicle = useTripStore((s) => s.cancelVehicle);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const vehicles = useMemo(() => allVehicles.filter((v) => v.tenantId === activeTenantId), [allVehicles, activeTenantId]);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const drivers = useMemo(() => allDrivers.filter((d) => d.tenantId === activeTenantId), [allDrivers, activeTenantId]);
  const addToast = useToastStore((s) => s.addToast);

  const [filterStatus, setFilterStatus] = useState<VehicleStatus | "ALL">("ALL");
  const [actionModal, setActionModal] = useState<{ tripId: string; vehicleIndex: number; nextStatus: VehicleStatus } | null>(null);
  const [preflightWarning, setPreflightWarning] = useState<string | null>(null);
  const [overridePreflight, setOverridePreflight] = useState(false);

  // Flatten all vehicles from all trips for dispatch view
  const dispatchVehicles = useMemo(() => {
    const items: Array<{
      tripId: string;
      vehicleIndex: number;
      trip: any;
      tripStatus: TripStatus;
      derivedTripStatus: TripStatus;
      customerId: string;
      vehicleStatus: VehicleStatus;
      pax: number;
      assignedVehicleId?: string;
      assignedDriverId?: string;
      lockedPrice?: number;
      stops: number;
      nextStop?: string;
    }> = [];

    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle, idx) => {
        if (filterStatus !== "ALL" && vehicle.status !== filterStatus) return;

        items.push({
          tripId: trip.id,
          vehicleIndex: idx,
          trip,
          tripStatus: trip.status,
          derivedTripStatus: getDerivedTripStatus(trip.id),
          customerId: trip.customerId,
          vehicleStatus: vehicle.status as VehicleStatus,
          pax: vehicle.pax.length,
          assignedVehicleId: vehicle.vehicleId,
          assignedDriverId: vehicle.driverId,
          lockedPrice: vehicle.lockedPrice,
          stops: trip.stops.length,
          nextStop: trip.stops[1]?.address,
        });
      });
    });

    return items.sort((a, b) => {
      const priority: Record<VehicleStatus, number> = {
        SOS: 0,
        IN_TRANSIT: 1,
        AT_DROP: 2,
        PAX_PICKED: 3,
        AT_PICKUP: 4,
        EN_ROUTE_PICKUP: 5,
        DRIVER_ACCEPTED: 6,
        ASSIGNED: 7,
        PENDING: 100,
        DRIVER_REJECTED: 100,
        NO_SHOW: 100,
        BREAKDOWN: 100,
        ACCIDENT: 100,
        VEHICLE_SWAP: 100,
        DELAYED: 100,
        PAX_DROPPED: 100,
        COMPLETED: 100,
        CANCELLED: 100,
      };
      return (priority[a.vehicleStatus] || 999) - (priority[b.vehicleStatus] || 999);
    });
  }, [trips, filterStatus, getDerivedTripStatus]);

  const activeTripsCount = dispatchVehicles.filter((v) =>
    ["EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"].includes(v.vehicleStatus)
  ).length;
  const inTransitCount = dispatchVehicles.filter((v) => v.vehicleStatus === "IN_TRANSIT").length;
  const alertsCount = dispatchVehicles.filter((v) => ["SOS", "BREAKDOWN", "ACCIDENT", "DELAYED", "NO_SHOW"].includes(v.vehicleStatus)).length;

  const handleAdvanceStatus = (nextStatus: VehicleStatus) => {
    if (!actionModal) return;

    // Pre-flight: checkTime before EN_ROUTE_PICKUP
    if (nextStatus === "EN_ROUTE_PICKUP") {
      const trip = trips.find((t) => t.id === actionModal.tripId);
      if (trip && trip.stops[0]?.plannedTime) {
        const now = new Date();
        const pickupTime = new Date(trip.stops[0].plannedTime);
        const hoursUntilPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilPickup > 2) {
          if (!overridePreflight) {
            setPreflightWarning(
              `Scheduled pickup is ${hoursUntilPickup.toFixed(1)} hours away (more than 2h threshold). Click "Override & Advance" to proceed anyway.`
            );
            return;
          }
        }
      }
    }

    const result = advanceVehicleStatus(actionModal.tripId, actionModal.vehicleIndex, nextStatus);
    if (result.success) {
      addToast(result.message, "success");
    } else {
      addToast(result.message, "error");
    }
    setActionModal(null);
    setPreflightWarning(null);
    setOverridePreflight(false);
  };

  const handleCancel = () => {
    if (!actionModal) return;

    const result = cancelVehicle(actionModal.tripId, actionModal.vehicleIndex);
    if (result.success) {
      addToast(result.message, "success");
    } else {
      addToast(result.message, "error");
    }
    setActionModal(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dispatch Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Real-time trip tracking and vehicle management with lifecycle validation</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">Active Vehicles</p>
            <p className="text-2xl font-bold text-white mt-1">{activeTripsCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">In Transit</p>
            <p className="text-2xl font-bold text-white mt-1">{inTransitCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">Total Vehicles</p>
            <p className="text-2xl font-bold text-white mt-1">{dispatchVehicles.length}</p>
          </div>
        </div>
        <div className={`${alertsCount > 0 ? "bg-danger border-danger" : "bg-ops-sidebar border-ops-sidebar"} rounded-xl shadow-lg p-4 border`}>
          <div>
            <p className={`text-xs ${alertsCount > 0 ? "text-white" : "text-white/60"}`}>Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${alertsCount > 0 ? "text-white" : "text-white"}`}>{alertsCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <label className="block text-xs text-text-secondary mb-2">Filter by Vehicle Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as VehicleStatus | "ALL")}
          className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary"
        >
          <option value="ALL">All Statuses</option>
          {DISPATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Dispatch Board */}
      <Card padding="lg" header={<h3 className="font-semibold">📍 Active Vehicles ({dispatchVehicles.length})</h3>}>
        <div className="space-y-3">
          {dispatchVehicles.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">No vehicles to display</p>
          ) : (
            dispatchVehicles.map((item) => {
              const customer = customers.find((c) => c.id === item.customerId);
              const fleetVehicle = item.assignedVehicleId ? vehicles.find((v) => v.id === item.assignedVehicleId) : null;
              const driver = item.assignedDriverId ? drivers.find((d) => d.id === item.assignedDriverId) : null;
              const isAlert = ["SOS", "BREAKDOWN", "ACCIDENT", "DELAYED", "NO_SHOW"].includes(item.vehicleStatus);
              const nextTransitions = getNextValidTransitions(item.vehicleStatus);
              const canAdvance = nextTransitions.length > 0;

              return (
                <div
                  key={`${item.tripId}-${item.vehicleIndex}`}
                  className={`flex flex-col gap-3 p-4 rounded-xl border transition-colors ${
                    isAlert ? "bg-danger/5 border-danger/20" : item.vehicleStatus === "IN_TRANSIT" ? "bg-alert-amber/5 border-alert-amber/20" : "bg-white border-border"
                  }`}
                >
                  {/* Header: Status & Vehicle Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={item.vehicleStatus} />
                        {isAlert && <AlertCircle className="w-4 h-4 text-danger" />}
                      </div>

                      <p className="text-sm font-medium text-text-primary">
                        {fleetVehicle ? `${fleetVehicle.make} ${fleetVehicle.model}` : "Unassigned Vehicle"} — {customer?.name}
                      </p>

                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-text-secondary">
                        <div>
                          <span className="text-text-tertiary">Driver:</span> {driver ? <PII value={driver.name} type="name" /> : "Unassigned"}
                        </div>
                        <div>
                          <span className="text-text-tertiary">Pax:</span> {item.pax}
                        </div>
                        <div>
                          <span className="text-text-tertiary">Price:</span> ₹{item.lockedPrice || "—"}
                        </div>
                        <div>
                          <span className="text-text-tertiary">Trip:</span> {item.stops} stops
                        </div>
                      </div>

                      {item.nextStop && (
                        <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Next: {item.nextStop}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-xs">
                      <p className="text-text-secondary">Trip Status</p>
                      <p className="text-sm font-semibold text-text-primary">{item.derivedTripStatus}</p>
                    </div>
                  </div>

                  {/* Status Description */}
                  <div className="text-xs text-text-secondary p-2 bg-ops-bg rounded border border-border">
                    {getStatusDescription(item.vehicleStatus)}
                  </div>

                  {/* Action Buttons */}
                  {canAdvance && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {nextTransitions.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          onClick={() => setActionModal({ tripId: item.tripId, vehicleIndex: item.vehicleIndex, nextStatus })}
                          size="sm"
                          variant="primary"
                          className="text-xs flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {nextStatus}
                        </Button>
                      ))}

                      {/* Cancel button */}
                      <Button
                        onClick={() => {
                          setActionModal({ tripId: item.tripId, vehicleIndex: item.vehicleIndex, nextStatus: "CANCELLED" });
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-danger hover:bg-danger/10 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {!canAdvance && (
                    <div className="text-xs text-text-secondary p-2 bg-ops-bg rounded border border-border italic">
                      No further transitions available for {item.vehicleStatus}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Legend */}
      <Card padding="lg" header={<h3 className="font-semibold">📋 Status Legend</h3>}>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-medium text-text-primary mb-2">Active States</p>
            <div className="space-y-1">
              <p className="text-text-secondary">🚗 IN_TRANSIT — Vehicle moving</p>
              <p className="text-text-secondary">📍 AT_PICKUP — Waiting at pickup</p>
              <p className="text-text-secondary">✓ PAX_PICKED — Passengers aboard</p>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-2">Transition States</p>
            <div className="space-y-1">
              <p className="text-text-secondary">→ EN_ROUTE_PICKUP — Going to pickup</p>
              <p className="text-text-secondary">📋 DRIVER_ACCEPTED — Confirmed</p>
              <p className="text-text-secondary">📍 AT_DROP — At destination</p>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-2">Exception States</p>
            <div className="space-y-1">
              <p className="text-danger">🚨 SOS — Emergency</p>
              <p className="text-danger">⚠️ BREAKDOWN — Vehicle failure</p>
              <p className="text-danger">❌ NO_SHOW — Driver absent</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <Modal
          open={true}
          onClose={() => {
            setActionModal(null);
            setPreflightWarning(null);
            setOverridePreflight(false);
          }}
          title={`Advance to ${actionModal.nextStatus}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Confirm transition to <strong>{actionModal.nextStatus}</strong>?
            </p>

            {actionModal.nextStatus === "PAX_PICKED" && (
              <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-xs text-text-primary flex items-start gap-2">
                <Lock className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                <span><strong>OTP Required:</strong> Pickup OTP must be verified before this transition is allowed.</span>
              </div>
            )}

            {actionModal.nextStatus === "PAX_DROPPED" && (
              <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-xs text-text-primary flex items-start gap-2">
                <Lock className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                <span><strong>OTP Required:</strong> Drop OTP must be verified before this transition is allowed.</span>
              </div>
            )}

            {preflightWarning && (
              <div className="p-3 bg-alert-amber/10 border border-alert-amber/30 rounded-lg text-xs text-alert-amber flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Pre-flight Warning:</strong> {preflightWarning}</span>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!preflightWarning ? (
                <Button onClick={() => handleAdvanceStatus(actionModal.nextStatus)} variant="primary" className="flex-1">
                  Confirm
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setOverridePreflight(true);
                    setTimeout(() => handleAdvanceStatus(actionModal.nextStatus), 0);
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Override & Advance
                </Button>
              )}
              {actionModal.nextStatus === "CANCELLED" && (
                <Button onClick={handleCancel} variant="secondary" className="flex-1">
                  Cancel Trip
                </Button>
              )}
              {actionModal.nextStatus !== "CANCELLED" && (
                <Button onClick={() => {
                  setActionModal(null);
                  setPreflightWarning(null);
                  setOverridePreflight(false);
                }} variant="secondary" className="flex-1">
                  Close
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
