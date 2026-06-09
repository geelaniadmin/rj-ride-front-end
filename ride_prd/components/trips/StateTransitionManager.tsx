"use client";

import React, { useState } from "react";
import { TripRequest, TripStatus } from "@/lib/types";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface StateTransitionManagerProps {
  trip: TripRequest;
  onStatusChange?: (newStatus: TripStatus) => void;
}

export const StateTransitionManager: React.FC<StateTransitionManagerProps> = ({ trip, onStatusChange }) => {
  const addToast = useToastStore((s) => s.addToast);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const checkCanConfirm = (): { allowed: boolean; reason?: string } => {
    if (trip.status !== "DRAFT") {
      return { allowed: false, reason: "Trip must be in DRAFT status" };
    }

    // All vehicles must have a price locked
    const unpriced = trip.vehicles.filter((v) => !v.lockedPrice);
    if (unpriced.length > 0) {
      return { allowed: false, reason: `${unpriced.length} vehicle(s) missing locked price` };
    }

    // At least 1 vehicle
    if (trip.vehicles.length === 0) {
      return { allowed: false, reason: "Trip must have at least 1 vehicle" };
    }

    return { allowed: true };
  };

  const checkCanAssign = (): { allowed: boolean; reason?: string } => {
    if (trip.status !== "CONFIRMED" && trip.status !== "DRAFT") {
      return { allowed: false, reason: "Trip must be DRAFT or CONFIRMED" };
    }

    // All vehicles must be assigned (vehicle + driver)
    const unassigned = trip.vehicles.filter((v) => !v.vehicleId || !v.driverId);
    if (unassigned.length > 0) {
      return { allowed: false, reason: `${unassigned.length} vehicle(s) need vehicle + driver assignment` };
    }

    return { allowed: true };
  };

  const handleConfirm = async () => {
    const check = checkCanConfirm();
    if (!check.allowed) {
      addToast(`Cannot confirm: ${check.reason}`, "error");
      return;
    }

    setIsTransitioning(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      onStatusChange?.("CONFIRMED");
      addToast("Trip confirmed", "success");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAssign = async () => {
    const check = checkCanAssign();
    if (!check.allowed) {
      addToast(`Cannot assign: ${check.reason}`, "error");
      return;
    }

    setIsTransitioning(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      onStatusChange?.("ASSIGNED");
      addToast("Trip assigned", "success");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCancel = async () => {
    if (trip.status === "COMPLETED" || trip.status === "BILLED") {
      addToast("Cannot cancel completed/billed trips", "error");
      return;
    }

    setIsTransitioning(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      onStatusChange?.("CANCELLED");
      addToast("Trip cancelled", "info");
    } finally {
      setIsTransitioning(false);
    }
  };

  const confirmCheck = checkCanConfirm();
  const assignCheck = checkCanAssign();

  return (
    <Card padding="lg" header={<h3 className="font-semibold">⚙️ State Management</h3>}>
      <div className="space-y-3">
        {/* Current Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Current Status:</span>
          <Badge variant={trip.status === "DRAFT" ? "amber" : trip.status === "CONFIRMED" ? "blue" : "green"}>{trip.status}</Badge>
        </div>

        {/* Workflow Diagram */}
        <div className="flex items-center gap-2 text-xs my-3">
          <span className={trip.status === "DRAFT" ? "font-bold text-text-primary" : "text-text-secondary"}>DRAFT</span>
          <span className="text-text-secondary">→</span>
          <span className={trip.status === "CONFIRMED" ? "font-bold text-text-primary" : "text-text-secondary"}>CONFIRMED</span>
          <span className="text-text-secondary">→</span>
          <span className={trip.status === "ASSIGNED" ? "font-bold text-text-primary" : "text-text-secondary"}>ASSIGNED</span>
          <span className="text-text-secondary">→</span>
          <span className={trip.status === "IN_PROGRESS" ? "font-bold text-text-primary" : "text-text-secondary"}>IN_PROGRESS</span>
        </div>

        {/* Pre-flight Checks */}
        <div className="bg-ops-bg rounded p-3 space-y-2 text-xs">
          {trip.status === "DRAFT" && (
            <>
              <p className="font-medium text-text-primary">To Confirm (DRAFT → CONFIRMED):</p>
              <div className="space-y-1 pl-2">
                <p className={trip.vehicles.length > 0 ? "text-green-400" : "text-red-400"}>
                  {trip.vehicles.length > 0 ? "✓" : "✗"} {trip.vehicles.length} vehicle(s) added
                </p>
                <p className={trip.vehicles.every((v) => v.lockedPrice) ? "text-green-400" : "text-red-400"}>
                  {trip.vehicles.every((v) => v.lockedPrice) ? "✓" : "✗"} All vehicles priced
                </p>
              </div>
            </>
          )}

          {(trip.status === "CONFIRMED" || trip.status === "DRAFT") && (
            <>
              <p className="font-medium text-text-primary">To Assign (→ ASSIGNED):</p>
              <div className="space-y-1 pl-2">
                <p className={trip.vehicles.every((v) => v.vehicleId) ? "text-green-400" : "text-orange-400"}>
                  {trip.vehicles.every((v) => v.vehicleId) ? "✓" : "○"} All vehicles assigned
                </p>
                <p className={trip.vehicles.every((v) => v.driverId) ? "text-green-400" : "text-orange-400"}>
                  {trip.vehicles.every((v) => v.driverId) ? "✓" : "○"} All drivers assigned
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {trip.status === "DRAFT" && (
            <Button onClick={handleConfirm} variant="primary" loading={isTransitioning} disabled={!confirmCheck.allowed}>
              <CheckCircle className="w-3 h-3 mr-1" /> Confirm
            </Button>
          )}

          {(trip.status === "CONFIRMED" || trip.status === "DRAFT") && (
            <Button onClick={handleAssign} variant="primary" loading={isTransitioning} disabled={!assignCheck.allowed}>
              <Clock className="w-3 h-3 mr-1" /> Assign
            </Button>
          )}

          {trip.status !== "COMPLETED" && trip.status !== "BILLED" && trip.status !== "CANCELLED" && (
            <Button onClick={handleCancel} variant="ghost" loading={isTransitioning}>
              Cancel
            </Button>
          )}
        </div>

        {/* Hints */}
        {!confirmCheck.allowed && trip.status === "DRAFT" && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {confirmCheck.reason}
          </p>
        )}
        {!assignCheck.allowed && (trip.status === "CONFIRMED" || trip.status === "DRAFT") && (
          <p className="text-xs text-orange-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {assignCheck.reason}
          </p>
        )}
      </div>
    </Card>
  );
};

StateTransitionManager.displayName = "StateTransitionManager";
