"use client";

import React, { useState, useMemo } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@ride/shared";
import { useTenantStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TripDetailView } from "@/components/trips/TripDetailView";
import { TripRequest, ID, TripStatus, CreationMethod } from "@/lib/types";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export const TripsListTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allTrips = useTripStore((s) => s.trips) || [];
  const trips = useMemo(() => allTrips.filter((t) => t.tenantId === activeTenantId), [allTrips, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const updateTrip = useTripStore((s) => s.updateTrip);

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TripStatus | "ALL">("ALL");
  const [filterCustomer, setFilterCustomer] = useState<ID | "ALL">("ALL");
  const [filterCreatedVia, setFilterCreatedVia] = useState<CreationMethod | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterCustomer !== "ALL" && t.customerId !== filterCustomer) return false;
      if (filterCreatedVia !== "ALL" && t.createdVia !== filterCreatedVia) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchRef = t.reference?.toLowerCase().includes(q);
        const matchCustomer = customers.find((c) => c.id === t.customerId)?.name.toLowerCase().includes(q);
        return matchId || matchRef || matchCustomer;
      }
      return true;
    });
  }, [trips, filterStatus, filterCustomer, filterCreatedVia, searchQuery, customers]);

  const statuses: TripStatus[] = ["DRAFT", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "BILLED", "CANCELLED"];
  const creationMethods: CreationMethod[] = ["MANUAL", "BULK_UPLOAD", "API_PAX", "API_VEHICLE_COUNT", "RECURRING", "CLONE"];

  const detailTrip = trips.find((t) => t.id === detailTripId);

  if (detailTrip) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setDetailTripId(null)} variant="secondary" size="sm">
          ← Back to List
        </Button>
        <TripDetailView
          trip={detailTrip}
          onStatusChange={(newStatus) => {
            updateTrip(detailTrip.id, { status: newStatus });
          }}
          onAssignVehicle={(vehicleIndex, vehicleId, driverId) => {
            const updatedVehicles = detailTrip.vehicles.map((v, i) =>
              i === vehicleIndex ? { ...v, vehicleId, driverId } : v
            );
            updateTrip(detailTrip.id, { vehicles: updatedVehicles });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <Input placeholder="Search by Trip ID, Reference, or Customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

        <div className="grid grid-cols-3 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TripStatus | "ALL")}
            className="px-3 py-2 bg-white border border-border rounded text-sm text-text-primary"
          >
            <option value="ALL">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value as ID | "ALL")}
            className="px-3 py-2 bg-white border border-border rounded text-sm text-text-primary"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterCreatedVia}
            onChange={(e) => setFilterCreatedVia(e.target.value as CreationMethod | "ALL")}
            className="px-3 py-2 bg-white border border-border rounded text-sm text-text-primary"
          >
            <option value="ALL">All Creation Methods</option>
            {creationMethods.map((cm) => (
              <option key={cm} value={cm}>
                {cm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        <p className="text-xs text-text-secondary">{filteredTrips.length} trips found</p>
        {filteredTrips.length === 0 ? (
          <Card padding="lg" className="text-center text-text-secondary py-8">
            No trips found
          </Card>
        ) : (
          filteredTrips.map((trip) => {
            const customer = customers.find((c) => c.id === trip.customerId);
            const isExpanded = expandedTripId === trip.id;

            return (
              <div key={trip.id} className="border border-border rounded-lg overflow-hidden">
                <div
                  onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                  className="w-full p-4 bg-white hover:bg-ops-bg text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <StatusBadge status={trip.status} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {customer?.name || "Unknown Customer"} ({trip.vehicles.length} vehicle{trip.vehicles.length !== 1 ? "s" : ""})
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {trip.reference && <span>Ref: {trip.reference} • </span>}
                        Via: <Badge variant="blue">{trip.createdVia}</Badge> • Created: {new Date(trip.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => setDetailTripId(trip.id)}>
                      Details
                    </Button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-ops-bg border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Stops:</span>
                        <p className="text-text-primary mt-1">{trip.stops.length} stops</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Schedule:</span>
                        <p className="text-text-primary mt-1">{trip.schedule.type}</p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-text-primary mb-2">Vehicles:</p>
                      <div className="space-y-2">
                        {trip.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="flex items-center justify-between bg-white p-2 rounded text-xs border border-border">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={vehicle.status} />
                              <span className="text-text-primary">{vehicle.pax.length} pax</span>
                              <span className="text-text-tertiary font-mono">ID: {vehicle.id.substring(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {vehicle.lockedPrice && (
                                <span className="text-success font-medium">₹{vehicle.lockedPrice.toLocaleString()} (v{vehicle.lockedRateCardVersion})</span>
                              )}
                              {vehicle.priceId && (
                                <span className="text-text-tertiary font-mono text-[10px]">pid:{vehicle.priceId.substring(0, 6)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

TripsListTab.displayName = "TripsListTab";
