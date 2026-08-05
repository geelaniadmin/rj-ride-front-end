import { VehicleStatus, TripStatus } from "@/lib/types";

// Legal state transitions for vehicles (two-level state machine)
const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  PENDING: ["ASSIGNED", "DRIVER_REJECTED", "CANCELLED"],
  ASSIGNED: ["DRIVER_ACCEPTED", "DRIVER_REJECTED", "CANCELLED"],
  DRIVER_ACCEPTED: ["EN_ROUTE_PICKUP", "DRIVER_REJECTED", "CANCELLED"],
  DRIVER_REJECTED: ["ASSIGNED", "CANCELLED"],
  EN_ROUTE_PICKUP: ["AT_PICKUP", "DELAYED", "BREAKDOWN", "SOS", "CANCELLED"],
  AT_PICKUP: ["PAX_PICKED", "NO_SHOW", "BREAKDOWN", "SOS", "CANCELLED"],
  PAX_PICKED: ["IN_TRANSIT", "DELAYED", "BREAKDOWN", "SOS", "CANCELLED"],
  IN_TRANSIT: ["AT_DROP", "DELAYED", "BREAKDOWN", "ACCIDENT", "SOS", "CANCELLED"],
  AT_DROP: ["PAX_DROPPED", "BREAKDOWN", "SOS", "CANCELLED"],
  PAX_DROPPED: ["COMPLETED"],
  COMPLETED: [], // Terminal state
  NO_SHOW: [], // Exception state (no further transitions)
  BREAKDOWN: ["VEHICLE_SWAP", "CANCELLED"], // Can swap vehicle, then continue
  ACCIDENT: ["CANCELLED"], // Can only cancel
  VEHICLE_SWAP: ["EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"], // Restart from current phase
  DELAYED: ["EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"], // Resume from same phase
  SOS: ["BREAKDOWN", "CANCELLED"], // Emergency can become breakdown or cancel
  CANCELLED: [], // Terminal state
};

export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
  requiredOtpVerified?: "pickup" | "drop" | null;
}

export function isTransitionAllowed(currentStatus: VehicleStatus, nextStatus: VehicleStatus): TransitionValidation {
  const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowedNextStates.includes(nextStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentStatus} to ${nextStatus}. Legal transitions: ${allowedNextStates.join(", ") || "none (terminal state)"}`,
    };
  }

  // OTP gates: PAX_PICKED requires pickup OTP verified, PAX_DROPPED requires drop OTP verified
  if (nextStatus === "PAX_PICKED") {
    return {
      allowed: true,
      requiredOtpVerified: "pickup",
    };
  }

  if (nextStatus === "PAX_DROPPED") {
    return {
      allowed: true,
      requiredOtpVerified: "drop",
    };
  }

  return { allowed: true };
}

// Derive trip status from vehicle statuses (two-level state machine)
export function deriveTripStatus(vehicleStatuses: VehicleStatus[]): TripStatus {
  if (vehicleStatuses.length === 0) return "DRAFT";

  const statusCounts = vehicleStatuses.reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<VehicleStatus, number>
  );

  const totalVehicles = vehicleStatuses.length;
  const completedCount = (statusCounts.COMPLETED || 0) + (statusCounts.NO_SHOW || 0);
  const inProgressCount = vehicleStatuses.filter((s) =>
    ["EN_ROUTE_PICKUP", "AT_PICKUP", "PAX_PICKED", "IN_TRANSIT", "AT_DROP"].includes(s)
  ).length;
  const assignedCount = vehicleStatuses.filter((s) =>
    ["ASSIGNED", "DRIVER_ACCEPTED"].includes(s)
  ).length;
  const cancelledCount = statusCounts.CANCELLED || 0;

  // All cancelled → CANCELLED
  if (cancelledCount === totalVehicles) {
    return "CANCELLED";
  }

  // Any in progress → IN_PROGRESS
  if (inProgressCount > 0) {
    return "IN_PROGRESS";
  }

  // All assigned (including accepted) and no completed → ASSIGNED
  if (assignedCount === totalVehicles) {
    return "ASSIGNED";
  }

  // All completed/no-show → COMPLETED
  if (completedCount === totalVehicles) {
    return "COMPLETED";
  }

  // Mixed with some assigned and some completed → IN_PROGRESS (or ASSIGNED)
  if (assignedCount > 0 && completedCount > 0) {
    return "IN_PROGRESS";
  }

  // Default to CONFIRMED if some vehicles pending/rejected but not all confirmed yet
  return "CONFIRMED";
}

// Get next valid transitions for a given status
export function getNextValidTransitions(currentStatus: VehicleStatus): VehicleStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

// Check if status is terminal (no further transitions allowed)
export function isTerminalStatus(status: VehicleStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

// Check if status is an exception
export function isExceptionStatus(status: VehicleStatus): boolean {
  return ["SOS", "BREAKDOWN", "ACCIDENT", "DELAYED", "NO_SHOW", "VEHICLE_SWAP"].includes(status);
}

// Get human-readable description of status
export function getStatusDescription(status: VehicleStatus): string {
  const descriptions: Record<VehicleStatus, string> = {
    PENDING: "Waiting for assignment",
    ASSIGNED: "Assigned, waiting for driver acceptance",
    DRIVER_ACCEPTED: "Driver accepted, proceeding to pickup",
    DRIVER_REJECTED: "Driver rejected the trip",
    EN_ROUTE_PICKUP: "Driver en route to pickup location",
    AT_PICKUP: "Driver at pickup location",
    PAX_PICKED: "Passengers picked up, en route to drop",
    IN_TRANSIT: "In transit to drop location",
    AT_DROP: "At drop location",
    PAX_DROPPED: "Passengers dropped off",
    COMPLETED: "Trip completed successfully",
    NO_SHOW: "Driver no-show (did not arrive)",
    BREAKDOWN: "Vehicle breakdown, unable to proceed",
    ACCIDENT: "Vehicle accident, unable to proceed",
    VEHICLE_SWAP: "Vehicle being swapped for replacement",
    DELAYED: "Trip delayed but continuing",
    SOS: "Emergency assistance requested",
    CANCELLED: "Trip cancelled",
  };
  return descriptions[status] || status;
}
