"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, keys } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";

export type TripSummary = components["schemas"]["TripSummary"];
export type TripDetail = components["schemas"]["TripDetail"];
export type TripVehicle = components["schemas"]["TripVehicle"];

export function useVendorTrips() {
  return useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/trips", {
        params: { query: {} },
      });
      if (err) throw err;
      return res?.result?.results ?? [];
    },
    staleTime: 30_000,
  });
}

export function useVendorTripDetail(tripId: string | null) {
  return useQuery({
    queryKey: keys.trips.detail(tripId ?? ""),
    queryFn: async () => {
      if (!tripId) return null;
      const { data: res, error: err } = await apiClient.GET("/v1/trips/{id}", {
        params: { path: { id: tripId } },
      });
      if (err) throw err;
      return (res?.result ?? null) as unknown as TripDetail | null;
    },
    enabled: !!tripId,
  });
}
