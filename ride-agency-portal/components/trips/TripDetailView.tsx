"use client";

import React, { useMemo, useState } from "react";
import { TripRequest, VehicleStatus, TripStatus } from "@/lib/types";
import { useCustomerStore } from "@ride/shared";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { useTenantStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { PII } from "@/components/ui/PII";
import { StateTransitionManager } from "@/components/trips/StateTransitionManager";
import { VehicleAssignmentModal } from "@/components/trips/VehicleAssignmentModal";
import { TripMapView } from "@/components/trips/TripMapView";
import { TripAlerts } from "@/components/trips/TripAlerts";
import { OfferReQuote } from "@/components/trips/OfferReQuote";
import { BillingSection } from "@/components/trips/BillingSection";
import { MapPin, Users, Clock, FileText, ArrowRight } from "lucide-react";

interface TripDetailViewProps {
  trip: TripRequest;
  onStatusChange?: (newStatus: TripStatus) => void;
  onAssignVehicle?: (vehicleIndex: number, vehicleId: string, driverId?: string) => void;
  onReQuote?: (vehicleIndex: number, newPrice: number, newPriceId: string, newVersion: number) => void;
  onMarkBilled?: () => void;
}

export const TripDetailView: React.FC<TripDetailViewProps> = ({ trip, onStatusChange, onAssignVehicle, onReQuote, onMarkBilled }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVehicles = useVehicleStore((s) => s.vehicles) || [];
  const vehicles = useMemo(() => allVehicles.filter((v) => v.tenantId === activeTenantId), [allVehicles, activeTenantId]);
  const allDrivers = useDriverStore((s) => s.drivers) || [];
  const drivers = useMemo(() => allDrivers.filter((d) => d.tenantId === activeTenantId), [allDrivers, activeTenantId]);

  const customer = customers.find((c) => c.id === trip.customerId);
  const [assignmentVehicleIndex, setAssignmentVehicleIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card padding="lg" className="bg-gradient-to-r from-slate-800 to-slate-750">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Trip ID</p>
              <p className="font-mono text-sm text-text-primary">{trip.id.substring(0, 12)}</p>
            </div>
            <StatusBadge status={trip.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-secondary">Customer</p>
              <p className="text-text-primary font-medium">{customer?.name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Created Via</p>
              <Badge variant="blue">{trip.createdVia}</Badge>
            </div>
          </div>
          {trip.reference && (
            <div>
              <p className="text-xs text-text-secondary">Reference</p>
              <p className="text-text-primary">{trip.reference}</p>
            </div>
          )}
        </div>
      </Card>

      {/* State Transition Manager */}
      <StateTransitionManager trip={trip} onStatusChange={onStatusChange} />

      {/* Stops & Map */}
      <Card padding="lg" header={<h3 className="font-semibold">📍 Route ({trip.stops.length} stops)</h3>}>
        <div className="space-y-3">
          {trip.stops.map((stop, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <Badge variant={stop.type === "PICKUP" ? "green" : "blue"}>{idx === 0 ? "P" : "D"}</Badge>
                {idx < trip.stops.length - 1 && <div className="h-8 w-0.5 bg-ops-bg mt-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{stop.address}</p>
                <p className="text-xs text-text-secondary">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</p>
                {stop.plannedTime && <p className="text-xs text-text-secondary mt-1">📅 {new Date(stop.plannedTime).toLocaleString()}</p>}
                {stop.flightNumber && <p className="text-xs text-text-secondary">✈️ {stop.flightNumber}</p>}
                {stop.trainNumber && <p className="text-xs text-text-secondary">🚂 {stop.trainNumber}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mini Map */}
      <TripMapView stops={trip.stops} />

      {/* Vehicles & Assignment */}
      <Card padding="lg" header={<h3 className="font-semibold">🚗 Vehicles ({trip.vehicles.length})</h3>}>
        <div className="space-y-3">
          {trip.vehicles.map((vehicle, idx) => {
            const assignedVehicle = vehicle.vehicleId ? vehicles.find((v) => v.id === vehicle.vehicleId) : null;
            const assignedDriver = vehicle.driverId ? drivers.find((d) => d.id === vehicle.driverId) : null;

            return (
              <div key={vehicle.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">Vehicle {idx + 1}</span>
                    <StatusBadge status={vehicle.status as VehicleStatus} />
                  </div>
                  {trip.status === "ASSIGNED" || trip.status === "DRAFT" ? (
                    <Button size="sm" variant="secondary" onClick={() => setAssignmentVehicleIndex(idx)}>
                      Assign
                    </Button>
                  ) : null}
                </div>

                {/* Pricing */}
                {vehicle.lockedPrice && (
                  <p className="text-xs">
                    <span className="text-text-secondary">Price: </span>
                    <span className="text-text-primary font-medium">₹{vehicle.lockedPrice}</span>
                    <span className="text-text-secondary"> (v{vehicle.lockedRateCardVersion})</span>
                  </p>
                )}

                {/* Assignment Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-text-secondary">Vehicle</p>
                    <p className="text-text-primary">{assignedVehicle ? `${assignedVehicle.make} ${assignedVehicle.model}` : "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Driver</p>
                    <p className="text-text-primary">
                      {assignedDriver ? (
                        <>
                          <PII value={assignedDriver.name} type="name" /> <PII value={assignedDriver.phone} type="phone" />
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </p>
                  </div>
                </div>

                {/* Pax */}
                {vehicle.pax.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-text-primary mb-1">Passengers ({vehicle.pax.length}):</p>
                    <div className="flex gap-2 flex-wrap">
                      {vehicle.pax.map((pax) => (
                        <div key={pax.id} className="text-xs bg-ops-bg px-2 py-1 rounded">
                          {pax.name ? <PII value={pax.name} type="name" /> : "PAX"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trip Alerts */}
      <TripAlerts vehicles={trip.vehicles} />

      {/* Re-Quote Expired Offers */}
      <OfferReQuote
        tripId={trip.id}
        customerId={trip.customerId}
        tenantId={trip.tenantId}
        vehicles={trip.vehicles}
        quotedAt={trip.createdAt}
        onReQuote={onReQuote}
      />

      {/* Metadata */}
      {(trip.coordinator || trip.costCenter || trip.pos || trip.viewers) && (
        <Card padding="lg" header={<h3 className="font-semibold">📋 Metadata</h3>}>
          <div className="space-y-2 text-xs">
            {trip.coordinator && (
              <p>
                <span className="text-text-secondary">Coordinator: </span>
                {trip.coordinator.name && <PII value={trip.coordinator.name} type="name" />}
                {trip.coordinator.phone && <PII value={trip.coordinator.phone} type="phone" />}
              </p>
            )}
            {trip.costCenter && (
              <p>
                <span className="text-text-secondary">Cost Center: </span>
                <span className="text-text-primary">{trip.costCenter}</span>
              </p>
            )}
            {trip.pos && (
              <p>
                <span className="text-text-secondary">POS: </span>
                <span className="text-text-primary">{trip.pos}</span>
              </p>
            )}
            {trip.viewers && trip.viewers.length > 0 && (
              <p>
                <span className="text-text-secondary">Viewers: </span>
                <span className="text-text-primary">{trip.viewers.join(", ")}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Billing */}
      <BillingSection trip={trip} onMarkBilled={onMarkBilled} />

      {/* Assignment Modal */}
      {assignmentVehicleIndex !== null && (
        <VehicleAssignmentModal
          vehicleIndex={assignmentVehicleIndex}
          assignedVehicleId={trip.vehicles[assignmentVehicleIndex]?.vehicleId}
          assignedDriverId={trip.vehicles[assignmentVehicleIndex]?.driverId}
          vehicles={vehicles}
          drivers={drivers}
          onAssign={(vehicleId, driverId) => {
            onAssignVehicle?.(assignmentVehicleIndex, vehicleId, driverId);
            setAssignmentVehicleIndex(null);
          }}
          onClose={() => setAssignmentVehicleIndex(null)}
        />
      )}
    </div>
  );
};

TripDetailView.displayName = "TripDetailView";
