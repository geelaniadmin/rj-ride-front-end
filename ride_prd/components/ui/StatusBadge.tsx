import React from "react";
import { TripStatus, VehicleStatus } from "@/lib/types";
import { Badge } from "./Badge";

type Status = TripStatus | VehicleStatus;

const statusColorMap: Record<Status, "default" | "blue" | "green" | "amber" | "red" | "purple" | "teal"> = {
  // TripStatus
  DRAFT: "default",
  CONFIRMED: "blue",
  ASSIGNED: "purple",
  IN_PROGRESS: "amber",
  COMPLETED: "green",
  BILLED: "teal",
  CANCELLED: "red",

  // VehicleStatus
  PENDING: "default",
  DRIVER_ACCEPTED: "blue",
  DRIVER_REJECTED: "red",
  EN_ROUTE_PICKUP: "amber",
  AT_PICKUP: "amber",
  PAX_PICKED: "amber",
  IN_TRANSIT: "amber",
  AT_DROP: "teal",
  PAX_DROPPED: "green",
  NO_SHOW: "red",
  BREAKDOWN: "red",
  ACCIDENT: "red",
  VEHICLE_SWAP: "purple",
  DELAYED: "amber",
  SOS: "red",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const variant = statusColorMap[status] || "default";
  return (
    <Badge variant={variant} className={status === "SOS" ? "animate-pulse font-bold" : className}>
      {status}
    </Badge>
  );
};

StatusBadge.displayName = "StatusBadge";
