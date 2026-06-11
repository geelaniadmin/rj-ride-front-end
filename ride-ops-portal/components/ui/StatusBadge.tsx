'use client';

import React from 'react';
import { Badge, BadgeVariant } from './Badge';
import { VehicleStatus, TripStatus } from '@ride/shared';

function getTripStatusVariant(status: TripStatus): BadgeVariant {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'CONFIRMED':
      return 'blue';
    case 'ASSIGNED':
      return 'teal';
    case 'IN_PROGRESS':
      return 'purple';
    case 'COMPLETED':
      return 'green';
    case 'BILLED':
      return 'green';
    case 'CANCELLED':
      return 'red';
  }
}

function getVehicleStatusVariant(status: VehicleStatus): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'default';
    case 'ASSIGNED':
      return 'blue';
    case 'DRIVER_ACCEPTED':
      return 'teal';
    case 'DRIVER_REJECTED':
      return 'red';
    case 'EN_ROUTE_PICKUP':
      return 'purple';
    case 'AT_PICKUP':
      return 'purple';
    case 'PAX_PICKED':
      return 'purple';
    case 'IN_TRANSIT':
      return 'purple';
    case 'AT_DROP':
      return 'purple';
    case 'PAX_DROPPED':
      return 'green';
    case 'COMPLETED':
      return 'green';
    case 'NO_SHOW':
      return 'red';
    case 'BREAKDOWN':
      return 'red';
    case 'ACCIDENT':
      return 'red';
    case 'VEHICLE_SWAP':
      return 'amber';
    case 'DELAYED':
      return 'amber';
    case 'SOS':
      return 'red';
    case 'CANCELLED':
      return 'red';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface StatusBadgeProps {
  status: TripStatus | VehicleStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const isTripStatus = (s: string): s is TripStatus =>
    ['DRAFT', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED'].includes(s);
  const isVehicleStatus = (s: string): s is VehicleStatus =>
    [
      'PENDING',
      'ASSIGNED',
      'DRIVER_ACCEPTED',
      'DRIVER_REJECTED',
      'EN_ROUTE_PICKUP',
      'AT_PICKUP',
      'PAX_PICKED',
      'IN_TRANSIT',
      'AT_DROP',
      'PAX_DROPPED',
      'COMPLETED',
      'NO_SHOW',
      'BREAKDOWN',
      'ACCIDENT',
      'VEHICLE_SWAP',
      'DELAYED',
      'SOS',
      'CANCELLED',
    ].includes(s);

  let variant: BadgeVariant = 'default';
  if (isTripStatus(status)) {
    variant = getTripStatusVariant(status);
  } else if (isVehicleStatus(status)) {
    variant = getVehicleStatusVariant(status);
  }

  const isLiveStatus = ['SOS', 'IN_PROGRESS', 'EN_ROUTE_PICKUP', 'IN_TRANSIT'].includes(status);

  return (
    <Badge variant={variant} className={`${isLiveStatus ? 'animate-pulse' : ''} ${className}`}>
      {formatStatus(status)}
    </Badge>
  );
}
