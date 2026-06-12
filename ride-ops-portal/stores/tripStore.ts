'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TripRequest, TripStatus } from '@ride/shared';

interface TripStoreState {
  trips: TripRequest[];
}

interface TripStoreActions {
  setTrips: (trips: TripRequest[]) => void;
  getTripsByTenant: (tenantId: string) => TripRequest[];
  getTripById: (tripId: string) => TripRequest | undefined;
  getDerivedTripStatus: (tripId: string) => TripStatus | undefined;
}

export const useTripStore = create<TripStoreState & TripStoreActions>()(
  persist(
    (set, get) => ({
      trips: [],
      setTrips: (trips) => set({ trips }),
      getTripsByTenant: (tenantId) => get().trips.filter((t) => t.tenantId === tenantId),
      getTripById: (tripId) => get().trips.find((t) => t.id === tripId),
      getDerivedTripStatus: (tripId) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return undefined;
        const statuses = trip.vehicles.map((v) => v.status);
        if (statuses.includes('SOS') || statuses.includes('BREAKDOWN')) return 'IN_PROGRESS' as TripStatus;
        if (statuses.every((s) => s === 'COMPLETED' || s === 'NO_SHOW' || s === 'CANCELLED'))
          return 'COMPLETED' as TripStatus;
        if (statuses.some((s) => s === 'IN_TRANSIT' || s === 'EN_ROUTE_PICKUP')) return 'IN_PROGRESS' as TripStatus;
        if (statuses.some((s) => s === 'ASSIGNED' || s === 'DRIVER_ACCEPTED')) return 'ASSIGNED' as TripStatus;
        return trip.status;
      },
    }),
    { name: 'ride-ops-trips' }
  )
);
