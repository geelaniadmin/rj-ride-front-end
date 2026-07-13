"use client";

import React, { useMemo, useState } from "react";
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
import { TripStatus, VehicleStatus } from "@/lib/types";
import { getNextValidTransitions, getStatusDescription } from "@/lib/lifecycle";
import { executeAutoDispatch, AutoAssignResult } from "@/lib/dispatchEngine";
import { DispatchRulesPanel } from "@/components/dispatch/DispatchRulesPanel";
import { useDispatchStore } from "@/stores/dispatchStore";
import { MapPin, AlertCircle, ChevronRight, Lock, X, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";

const DISPATCH_STATUSES: VehicleStatus[] = ["ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP", "PAX_DROPPED"];

export default function DispatchPage() {
  const language = useLanguageStore((s) => s.language);
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

  // Auto-dispatch state
  const [showAutoAssignResult, setShowAutoAssignResult] = useState<AutoAssignResult | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

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
              t("scheduledPickupWarning", language).replace("{hours}", hoursUntilPickup.toFixed(1))
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
        <h1 className="text-3xl font-bold text-text-primary">{t("dispatchDashboard", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("dispatchDescription", language)}</p>
      </div>

      {/* ── Auto-Dispatch Panel ── */}
      <DispatchRulesPanel />

      {/* ── Auto-Assign Controls ── */}
      <div className="bg-gradient-to-r from-brand-blue/5 to-indigo-500/5 border border-brand-blue/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-blue" /> {t("autoDispatchEngine", language)}
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {t("autoDispatchDescription", language)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                setIsAutoAssigning(true);
                await new Promise((r) => setTimeout(r, 300));
                const result = executeAutoDispatch(activeTenantId);
                setShowAutoAssignResult(result);
                setIsAutoAssigning(false);
                addToast(result.summary, result.success ? "success" : "info");
              }}
              variant="primary"
              disabled={isAutoAssigning}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isAutoAssigning ? t("dispatching", language) : t("runAutoDispatch", language)}
            </Button>
          </div>
        </div>

        {/* Auto-Assign Result */}
        {showAutoAssignResult && (
          <div className="mt-3 pt-3 border-t border-brand-blue/10 space-y-2">
            <p className="text-xs font-medium text-text-primary">
              {showAutoAssignResult.assignments.length > 0
                ? t("vehiclesAssigned", language).replace("{count}", String(showAutoAssignResult.assignments.length))
                : t("noVehiclesAutoAssigned", language)}
            </p>
            {showAutoAssignResult.assignments.length > 0 && (
              <div className="space-y-1.5">
                {showAutoAssignResult.assignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] bg-success/5 border border-success/20 rounded-lg px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-text-primary">
                      {a.vehicleName} → {t("driverWithColon", language)} <strong>{a.driverName}</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {showAutoAssignResult.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] text-danger font-medium">
                  {t("failedCount", language).replace("{count}", String(showAutoAssignResult.failed.length))}
                </p>
                {showAutoAssignResult.failed.map((f, i) => (
                  <p key={i} className="text-[10px] text-danger/70 ml-1">
                    {f.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">{t("activeVehicles", language)}</p>
            <p className="text-2xl font-bold text-white mt-1">{activeTripsCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">{t("inTransit", language)}</p>
            <p className="text-2xl font-bold text-white mt-1">{inTransitCount}</p>
          </div>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <div>
            <p className="text-xs text-white/60">{t("totalVehicles", language)}</p>
            <p className="text-2xl font-bold text-white mt-1">{dispatchVehicles.length}</p>
          </div>
        </div>
        <div className={`${alertsCount > 0 ? "bg-danger border-danger" : "bg-ops-sidebar border-ops-sidebar"} rounded-xl shadow-lg p-4 border`}>
          <div>
            <p className={`text-xs ${alertsCount > 0 ? "text-white" : "text-white/60"}`}>{t("alerts", language)}</p>
            <p className={`text-2xl font-bold mt-1 ${alertsCount > 0 ? "text-white" : "text-white"}`}>{alertsCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <label className="block text-xs text-text-secondary mb-2">{t("filterByVehicleStatus", language)}</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as VehicleStatus | "ALL")}
          className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary"
        >
          <option value="ALL">{t("allStatuses", language)}</option>
          {DISPATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Dispatch Board */}
      <Card padding="lg" header={<h3 className="font-semibold">{t("activeVehiclesWithCount", language).replace("{count}", String(dispatchVehicles.length))}</h3>}>
        <div className="space-y-3">
          {dispatchVehicles.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">{t("noVehiclesToDisplay", language)}</p>
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
                        {fleetVehicle ? `${fleetVehicle.make} ${fleetVehicle.model}` : t("unassignedVehicle", language)} — {customer?.name}
                      </p>

                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-text-secondary">
                        <div>
                          <span className="text-text-tertiary">{t("driverWithColon", language)}</span> {driver ? <PII value={driver.name} type="name" /> : t("unassigned", language)}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("paxWithColon", language)}</span> {item.pax}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("priceWithColon", language)}</span> ₹{item.lockedPrice ?? t("dash", language)}
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t("tripWithColon", language)}</span> {item.stops} {t("stops", language)}
                        </div>
                      </div>

                      {item.nextStop && (
                        <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {t("nextWithColon", language)} {item.nextStop}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-xs">
                      <p className="text-text-secondary">{t("tripStatus", language)}</p>
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
                        {t("cancel", language)}
                      </Button>
                    </div>
                  )}

                  {!canAdvance && (
                    <div className="text-xs text-text-secondary p-2 bg-ops-bg rounded border border-border italic">
                      {t("noFurtherTransitions", language).replace("{status}", item.vehicleStatus)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Legend */}
      <Card padding="lg" header={<h3 className="font-semibold">{t("statusLegend", language)}</h3>}>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-medium text-text-primary mb-2">{t("activeStates", language)}</p>
            <div className="space-y-1">
              <p className="text-text-secondary">{t("legendInTransit", language)}</p>
              <p className="text-text-secondary">{t("legendAtPickup", language)}</p>
              <p className="text-text-secondary">{t("legendPaxPicked", language)}</p>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-2">{t("transitionStates", language)}</p>
            <div className="space-y-1">
              <p className="text-text-secondary">{t("legendEnRoutePickup", language)}</p>
              <p className="text-text-secondary">{t("legendDriverAccepted", language)}</p>
              <p className="text-text-secondary">{t("legendAtDrop", language)}</p>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-2">{t("exceptionStates", language)}</p>
            <div className="space-y-1">
              <p className="text-danger">{t("legendSOS", language)}</p>
              <p className="text-danger">{t("legendBreakdown", language)}</p>
              <p className="text-danger">{t("legendNoShow", language)}</p>
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
          title={t("advanceTo", language).replace("{status}", actionModal.nextStatus)}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t("confirmTransition", language).replace("{status}", actionModal.nextStatus)}
            </p>

            {actionModal.nextStatus === "PAX_PICKED" && (
              <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-xs text-text-primary flex items-start gap-2">
                <Lock className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                <span><strong>{t("otpRequired", language)}</strong> {t("pickupOtpMessage", language)}</span>
              </div>
            )}

            {actionModal.nextStatus === "PAX_DROPPED" && (
              <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-xs text-text-primary flex items-start gap-2">
                <Lock className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                <span><strong>{t("otpRequired", language)}</strong> {t("dropOtpMessage", language)}</span>
              </div>
            )}

            {preflightWarning && (
              <div className="p-3 bg-alert-amber/10 border border-alert-amber/30 rounded-lg text-xs text-alert-amber flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>{t("preflightWarning", language)}:</strong> {preflightWarning}</span>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!preflightWarning ? (
                <Button onClick={() => handleAdvanceStatus(actionModal.nextStatus)} variant="primary" className="flex-1">
                  {t("confirmAction", language)}
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
                  <AlertTriangle className="w-3 h-3 mr-1" /> {t("overrideAndAdvance", language)}
                </Button>
              )}
              {actionModal.nextStatus === "CANCELLED" && (
                <Button onClick={handleCancel} variant="secondary" className="flex-1">
                  {t("cancelTrip", language)}
                </Button>
              )}
              {actionModal.nextStatus !== "CANCELLED" && (
                <Button onClick={() => {
                  setActionModal(null);
                  setPreflightWarning(null);
                  setOverridePreflight(false);
                }} variant="secondary" className="flex-1">
                  {t("close", language)}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
