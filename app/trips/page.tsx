"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSessionStore, useTripStore, useDriverStore, useVehicleStore, useVendorInfoStore, useVehicleTypeStore } from "@ride/shared";
import { useVendorTrips, type VendorTrip } from "@/hooks/useVendorTrips";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PiiField } from "@/components/ui/PiiField";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { TripMapViewWrapper } from "@/components/trips/TripMapViewWrapper";
import { ReceiptModal } from "@/components/trips/ReceiptModal";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, X, Filter, MapPin, Route, User, DollarSign, ChevronDown, Star, CheckCircle, XCircle, Receipt } from "lucide-react";

const VEHICLE_TYPES = ["All", "Sedan", "SUV", "Tempo Traveller", "Coach"];

export default function TripsPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const acceptTrip = useTripStore((s) => s.acceptTrip);
  const declineTrip = useTripStore((s) => s.declineTrip);
  const drivers = useDriverStore((s) => s.drivers);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const getVendorName = useVendorInfoStore((s) => s.getVendorName);
  const { addToast } = useToast();

  if (!vendorSession) return null;

  const { vendorTrips } = useVendorTrips(vendorSession.vendorId);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [selectedTrip, setSelectedTrip] = useState<VendorTrip | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [acceptDriverId, setAcceptDriverId] = useState("");
  const [acceptVehicleId, setAcceptVehicleId] = useState("");
  const [declineReason, setDeclineReason] = useState("No drivers available");
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter status options
  const statusOptions = useMemo(() => {
    const set = new Set(vendorTrips.map((t) => t.status));
    return ["All", ...Array.from(set)];
  }, [vendorTrips]);

  const filteredTrips = useMemo(() => {
    return vendorTrips.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (typeFilter !== "All" && t.vehicleType !== typeFilter) return false;
      if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        const matchId = t.tripId.toLowerCase().includes(q);
        const matchCustomer = t.customerId.toLowerCase().includes(q);
        const matchRoute = t.stops.some((s) => s.address.toLowerCase().includes(q));
        if (!matchId && !matchCustomer && !matchRoute) return false;
      }
      return true;
    });
  }, [vendorTrips, statusFilter, typeFilter, debouncedSearchQuery]);

  // Available drivers for accept modal
  const availableDrivers = useMemo(() => {
    return drivers.filter((d) => d.vendorId === vendorSession.vendorId && d.available && d.active);
  }, [drivers, vendorSession.vendorId]);

  // Available vehicles for accept modal
  const vendorVehicles = useMemo(() => {
    return vehicles.filter((v) => v.ownerVendorId === vendorSession.vendorId && v.active);
  }, [vehicles, vendorSession.vendorId]);

  const clearFilters = useCallback(() => {
    setStatusFilter("All");
    setTypeFilter("All");
    setSearchQuery("");
  }, []);

  const hasFilters = statusFilter !== "All" || typeFilter !== "All" || searchQuery !== "";

  // Accept handler
  const handleAccept = useCallback(async () => {
    if (!selectedTrip || !acceptDriverId || !acceptVehicleId) return;
    setIsProcessing(true);
    const driver = drivers.find((d) => d.id === acceptDriverId);
    const vehicle = vehicles.find((v) => v.id === acceptVehicleId);
    try {
      const result = acceptTrip(selectedTrip.tripId, vendorSession!.vendorId, acceptDriverId, acceptVehicleId);
      if (result.success) {
        addToast(`Trip ${selectedTrip.tripId.slice(0, 8)} accepted — ${driver?.name ? driver.name.split(" ")[0] + " assigned" : "driver assigned"} to ${vehicle?.registrationNo || "vehicle"}`, "success");
        setShowAcceptModal(false);
        setSelectedTrip(null);
      } else {
        addToast(result.message, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTrip, acceptDriverId, acceptVehicleId, drivers, vehicles, vendorSession, acceptTrip, addToast]);

  // Decline handler
  const handleDecline = useCallback(async () => {
    if (!selectedTrip) return;
    setIsProcessing(true);
    try {
      const result = declineTrip(selectedTrip.tripId, vendorSession!.vendorId, declineReason);
      if (result.success) {
        addToast(`Trip ${selectedTrip.tripId.slice(0, 8)} declined — ${result.failoverTo ? `assigned to ${getVendorName(result.failoverTo)}` : "no vendors available"}`, "info");
        setShowDeclineModal(false);
        setSelectedTrip(null);
      } else {
        addToast(result.message, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTrip, vendorSession, declineReason, declineTrip, addToast, getVendorName]);

  const handleRowClick = (trip: VendorTrip) => {
    setSelectedTrip(trip);
    setShowDetailDrawer(true);
  };

  const autoAssign = useCallback(() => {
    const bestDriver = [...availableDrivers].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const matchingVehicle = vendorVehicles.find((v) => {
      const vType = selectedTrip?.vehicleType?.toLowerCase();
      return v.vehicleTypeId && vType && vehicleTypes.find((vt) => vt.id === v.vehicleTypeId && vt.name.toLowerCase() === vType);
    }) || vendorVehicles[0];
    setAcceptDriverId(bestDriver?.id || "");
    setAcceptVehicleId(matchingVehicle?.id || (vendorVehicles[0]?.id || ""));
  }, [availableDrivers, vendorVehicles, selectedTrip, vehicleTypes]);

  const handleAcceptClick = (trip: VendorTrip) => {
    setSelectedTrip(trip);
    // Auto-select best driver and matching vehicle
    const bestDriver = [...availableDrivers].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const matchingVehicle = vendorVehicles.find((v) => {
      const vType = trip.vehicleType?.toLowerCase();
      return v.vehicleTypeId && vType && vehicleTypes.find((vt) => vt.id === v.vehicleTypeId && vt.name.toLowerCase() === vType);
    }) || vendorVehicles[0];
    setAcceptDriverId(bestDriver?.id || "");
    setAcceptVehicleId(matchingVehicle?.id || (vendorVehicles[0]?.id || ""));
    setShowAcceptModal(true);
  };

  const handleDeclineClick = (trip: VendorTrip) => {
    setSelectedTrip(trip);
    setDeclineReason("No drivers available");
    setShowDeclineModal(true);
  };

  // Find driver and vehicle details for selected trip
  const tripDriver = selectedTrip?.assignedDriverId ? drivers.find((d) => d.id === selectedTrip.assignedDriverId) : undefined;
  const tripVehicle = selectedTrip?.assignedVehicleId ? vehicles.find((v) => v.id === selectedTrip.assignedVehicleId) : undefined;

  // Columns for DataTable
  const columns: Column<VendorTrip>[] = [
    { key: "tripId", header: "Trip ID", render: (t) => <span className="font-mono text-xs">{t.tripId.slice(0, 8)}</span>, sortable: true },
    { key: "vehicleType", header: "Type", render: (t) => <span className="text-sm">{t.vehicleType}</span>, sortable: true },
    { key: "route", header: "Route", render: (t) => (
      <span className="text-xs text-text-muted truncate max-w-[200px] inline-block">
        {t.stops[0]?.address?.split(",")[0] || "?"} → {t.stops[1]?.address?.split(",")[0] || "?"}
      </span>
    )},
    { key: "driver", header: "Driver", render: (t) => {
      const driver = t.assignedDriverId ? drivers.find((d) => d.id === t.assignedDriverId) : undefined;
      return driver ? <PiiField value={driver.name} /> : <span className="text-text-muted">—</span>;
    }},
    { key: "vehicle", header: "Assigned Vehicle", render: (t) => {
      const vehicle = t.assignedVehicleId ? vehicles.find((v) => v.id === t.assignedVehicleId) : undefined;
      if (!vehicle) return <span className="text-text-muted">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary">{vehicle.registrationNo}</span>
          <span className="text-[10px] text-text-muted">{vehicle.make} {vehicle.model}</span>
        </div>
      );
    }},
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} />, sortable: true },
    { key: "lockedPrice", header: "Price", render: (t) => `₹${Math.round(t.lockedPrice)}`, sortable: true },
    { key: "actions", header: "Actions", render: (t) => {
      if (t.status === "ASSIGNED" || t.status === "PENDING") {
        return (
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleAcceptClick(t); }}
              className="px-2.5 py-1 bg-success text-white text-xs rounded-md hover:bg-success/90 transition-colors font-medium"
            >
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeclineClick(t); }}
              className="px-2.5 py-1 bg-danger/10 text-danger text-xs rounded-md hover:bg-danger/20 transition-colors font-medium"
            >
              Decline
            </button>
          </div>
        );
      }
      if (t.status === "COMPLETED") {
        return (
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetailDrawer(false); setSelectedTrip(t); setShowReceiptModal(true); }}
              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md hover:bg-emerald-100 transition-colors font-medium flex items-center gap-1"
            >
              <Receipt className="w-3 h-3" /> Receipt
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedTrip(t); setShowDetailDrawer(true); }}
              className="px-2.5 py-1 text-xs text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors font-medium"
            >
              View
            </button>
          </div>
        );
      }
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTrip(t); setShowDetailDrawer(true); }}
          className="px-2.5 py-1 text-xs text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors font-medium"
        >
          View
        </button>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Trips</h2>
        <p className="text-sm text-text-muted mt-1">
          {vendorTrips.length} trips assigned to your fleet
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-card-bg border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trip ID or route..."
              className="w-full pl-9 pr-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Statuses" : s.replace(/_/g, " ")}</option>
            ))}
          </select>

          {/* Vehicle type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Trips table */}
      <DataTable
        columns={columns}
        data={filteredTrips}
        pageSize={15}
        emptyMessage="No trips match your filters"
        onRowClick={handleRowClick}
      />

      {/* === ACCEPT MODAL === */}
      <Modal open={showAcceptModal} onClose={() => setShowAcceptModal(false)} title={`Accept Trip ${selectedTrip?.tripId?.slice(0, 8) || ""}`} size="lg">
        {selectedTrip && (
          <div className="space-y-4">
            <div className="p-4 bg-ops-bg rounded-lg space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-text-muted">Route:</span> <span className="text-text-primary">{selectedTrip.stops[0]?.address?.split(",")[0]} → {selectedTrip.stops[1]?.address?.split(",")[0]}</span></div>
                <div><span className="text-text-muted">Scheduled:</span> <span className="text-text-primary">{new Date(selectedTrip.scheduledAt).toLocaleString()}</span></div>
                <div><span className="text-text-muted">Vehicle:</span> <span className="text-text-primary">{selectedTrip.vehicleType}</span></div>
                <div><span className="text-text-muted">Locked Price:</span> <span className="text-text-primary font-semibold">₹{Math.round(selectedTrip.lockedPrice)}</span></div>
              </div>
            </div>

            {/* Auto-assign button */}
            <button
              onClick={autoAssign}
              className="w-full px-3 py-2 bg-brand-blue/10 text-brand-blue text-sm rounded-lg font-medium hover:bg-brand-blue/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto Assign Best Driver & Vehicle
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Driver selector */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assign Driver <span className="text-danger">*</span>
                </label>
                <select
                  value={acceptDriverId}
                  onChange={(e) => setAcceptDriverId(e.target.value)}
                  className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {availableDrivers.length === 0 && <option value="">No available drivers</option>}
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — ★ {d.rating || "—"}
                    </option>
                  ))}
                </select>
                {acceptDriverId && (() => {
                  const d = drivers.find((x) => x.id === acceptDriverId);
                  return d ? (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="bg-ops-bg px-2 py-0.5 rounded">📞 {d.phone}</span>
                      {d.assignedVehicleIds?.length ? (
                        <span className="bg-ops-bg px-2 py-0.5 rounded">🚗 {d.assignedVehicleIds.length} vehicle(s)</span>
                      ) : null}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Vehicle selector */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assign Vehicle <span className="text-danger">*</span>
                </label>
                <select
                  value={acceptVehicleId}
                  onChange={(e) => setAcceptVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {vendorVehicles.length === 0 && <option value="">No vehicles available</option>}
                  {vendorVehicles.map((v) => {
                    const vTypeName = vehicleTypes.find((vt) => vt.id === v.vehicleTypeId)?.name;
                    return (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo} — {v.make} {v.model}{vTypeName ? ` (${vTypeName})` : ""}
                      </option>
                    );
                  })}
                </select>
                {acceptVehicleId && (() => {
                  const v = vehicles.find((x) => x.id === acceptVehicleId);
                  return v ? (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="bg-ops-bg px-2 py-0.5 rounded">👤 Seats {v.seatingCapacity}</span>
                      <span className="bg-ops-bg px-2 py-0.5 rounded">{v.fuelType}</span>
                      {v.ac ? <span className="bg-ops-bg px-2 py-0.5 rounded">❄️ AC</span> : null}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAccept}
                disabled={!acceptDriverId || !acceptVehicleId || isProcessing}
                className="flex-1 px-4 py-2.5 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Accepting..." : "Confirm Accept"}
              </button>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* === DECLINE MODAL === */}
      <Modal open={showDeclineModal} onClose={() => setShowDeclineModal(false)} title={`Reject Trip ${selectedTrip?.tripId?.slice(0, 8) || ""}`}>
        {selectedTrip && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠ Operator will be notified — auto-failover to another vendor may trigger.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Reason (required)</label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="No drivers available">No drivers available</option>
                <option value="No vehicles available">No vehicles available</option>
                <option value="Location out of coverage">Location out of coverage</option>
                <option value="Scheduling conflict">Scheduling conflict</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDecline}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-lg font-medium text-sm hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Rejecting..." : "Confirm Reject"}
              </button>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* === TRIP DETAIL DRAWER === */}
      {/* TRIP DETAIL DRAWER */}
      <Drawer open={showDetailDrawer} onClose={() => setShowDetailDrawer(false)} title={`Trip Details`} width="max-w-xl">
        {selectedTrip && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-text-muted">{selectedTrip.tripId}</span>
              <StatusBadge status={selectedTrip.status} size="md" />
            </div>

            {/* Route */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Route</h4>
              <div className="space-y-3">
                {selectedTrip.stops.map((stop, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-success" : idx === selectedTrip.stops.length - 1 ? "bg-danger" : "bg-warning"} mt-1`} />
                      {idx < selectedTrip.stops.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                    </div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">{stop.address}</p>
                      <p className="text-xs text-text-muted">
                        {stop.locationType} · {stop.type}
                        {stop.plannedTime && ` · ${new Date(stop.plannedTime).toLocaleTimeString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Map — lazy loaded Leaflet */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Route Map</h4>
              <TripMapViewWrapper stops={selectedTrip.stops} />
            </div>

            {/* Assignment — visible throughout trip lifecycle */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {tripDriver && tripVehicle ? "Assigned Crew" : "Assignment"}
              </h4>
              <div className={`p-4 rounded-lg ${tripDriver && tripVehicle ? "bg-emerald-50 border border-emerald-200" : "bg-ops-bg"}`}>
                {tripDriver && tripVehicle && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-xs font-medium text-success">Driver & Vehicle assigned</span>
                  </div>
                )}
                <div className="space-y-3 text-sm">
                  {tripDriver ? (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Driver</p>
                        <p className="text-text-primary font-medium"><PiiField value={tripDriver.name} /></p>
                        <p className="text-xs text-text-muted"><PiiField value={tripDriver.phone} /></p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-text-muted">
                      <User className="w-4 h-4" />
                      <span className="text-sm">No driver assigned yet</span>
                    </div>
                  )}
                  <div className="border-t border-border/50" />
                  {tripVehicle ? (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Vehicle</p>
                        <p className="text-text-primary font-medium">{tripVehicle.registrationNo}</p>
                        <p className="text-xs text-text-muted">{tripVehicle.make} {tripVehicle.model} · {tripVehicle.seatingCapacity} seats · {tripVehicle.fuelType}{tripVehicle.ac ? " · AC" : ""}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-text-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm">No vehicle assigned yet</span>
                    </div>
                  )}
                  <div className="border-t border-border/50" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Vehicle Type</span>
                      <p className="text-text-primary font-medium">{selectedTrip.vehicleType}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Scheduled</span>
                      <p className="text-text-primary font-medium">{new Date(selectedTrip.scheduledAt).toLocaleDateString()}</p>
                      <p className="text-text-muted">{new Date(selectedTrip.scheduledAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Pricing</h4>
              <div className="p-3 bg-ops-bg rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Locked Price</span>
                  <span className="text-text-primary font-semibold">₹{Math.round(selectedTrip.lockedPrice)}</span>
                </div>
                <p className="text-xs text-success">✓ Price locked at quote time — rate card v{selectedTrip.lockedRateCardVersion}</p>
              </div>
            </div>

            {/* Billing section for completed trips */}
            {selectedTrip.status === "COMPLETED" && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Billing</h4>
                <div className="p-3 bg-ops-bg rounded-lg space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Gross Fare</span>
                    <span className="text-text-primary">₹{Math.round(selectedTrip.lockedPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Operator Fee (15%)</span>
                    <span className="text-danger">-₹{Math.round(selectedTrip.lockedPrice * 0.15)}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between text-sm font-semibold">
                    <span className="text-text-primary">Net to Vendor</span>
                    <span className="text-success">₹{Math.round(selectedTrip.lockedPrice * 0.85)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowDetailDrawer(false); setSelectedTrip(selectedTrip); setShowReceiptModal(true); }}
                  className="mt-2 w-full px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" /> View Receipt
                </button>
              </div>
            )}

            {/* Dispatch history — vendor decline log */}
            {selectedTrip.vendorDeclineLog && selectedTrip.vendorDeclineLog.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Dispatch History</h4>
                <div className="space-y-2">
                  {selectedTrip.vendorDeclineLog.map((entry: { vendorId: string; reason: string; declinedAt: string }, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-amber-50 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                      <div>
                        <p className="text-amber-800 font-medium">{getVendorName(entry.vendorId)} declined</p>
                        <p className="text-amber-600">{entry.reason} · {new Date(entry.declinedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {(selectedTrip.status === "ASSIGNED" || selectedTrip.status === "PENDING") && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowDetailDrawer(false); handleAcceptClick(selectedTrip); }}
                  className="flex-1 px-4 py-2.5 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Accept
                </button>
                <button
                  onClick={() => { setShowDetailDrawer(false); handleDeclineClick(selectedTrip); }}
                  className="flex-1 px-4 py-2.5 bg-danger/10 text-danger rounded-lg font-medium text-sm hover:bg-danger/20 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* === RECEIPT MODAL === */}
      <ReceiptModal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        trip={selectedTrip}
        vendorName={getVendorName(vendorSession.vendorId)}
      />
    </div>
  );
}
