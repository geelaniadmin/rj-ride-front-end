"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PoolingConfig, SafetyConstraint, PooledTrip, Stop, ID } from "@/lib/types";
import { id } from "@/lib/mock";

const DEFAULT_SAFETY_CONSTRAINTS: SafetyConstraint[] = [
  { type: "NO_LONE_FEMALE_LAST_DROP", enabled: true },
  { type: "SAME_GENDER_PREFERRED", enabled: false },
  { type: "NIGHT_SHIFT_ESCORT", enabled: true },
  { type: "MAX_TRAVEL_TIME", enabled: true, params: { maxMinutes: 90 } },
  { type: "NO_OVERNIGHT_ALONE", enabled: true },
];

interface PoolingStore {
  configs: PoolingConfig[];
  pooledTrips: PooledTrip[];

  // Config CRUD
  addConfig: (cfg: Omit<PoolingConfig, "id">) => string;
  updateConfig: (id: ID, updates: Partial<PoolingConfig>) => void;
  removeConfig: (id: ID) => void;
  getConfigsByTenant: (tenantId: ID) => PoolingConfig[];

  // Pooled trips
  addPooledTrip: (trip: Omit<PooledTrip, "id" | "createdAt" | "updatedAt">) => string;
  updatePooledTrip: (id: ID, updates: Partial<PooledTrip>) => void;
  removePooledTrip: (id: ID) => void;
  getPooledTripsByTenant: (tenantId: ID) => PooledTrip[];
  getPooledTripsByDate: (tenantId: ID, date: string) => PooledTrip[];
}

export const usePoolingStore = create<PoolingStore>()(
  persist(
    (set, get) => ({
      configs: [],
      pooledTrips: [],

      addConfig: (cfg) => {
        const configId = id();
        set((state) => ({
          configs: [...state.configs, { ...cfg, id: configId }],
        }));
        return configId;
      },

      updateConfig: (id, updates) => {
        set((state) => ({
          configs: state.configs.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      removeConfig: (id) => {
        set((state) => ({
          configs: state.configs.filter((c) => c.id !== id),
        }));
      },

      getConfigsByTenant: (tenantId) => {
        return get().configs.filter((c) => c.tenantId === tenantId);
      },

      addPooledTrip: (trip) => {
        const tripId = id();
        const now = new Date().toISOString();
        set((state) => ({
          pooledTrips: [
            ...state.pooledTrips,
            { ...trip, id: tripId, createdAt: now, updatedAt: now },
          ],
        }));
        return tripId;
      },

      updatePooledTrip: (id, updates) => {
        set((state) => ({
          pooledTrips: state.pooledTrips.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      removePooledTrip: (id) => {
        set((state) => ({
          pooledTrips: state.pooledTrips.filter((t) => t.id !== id),
        }));
      },

      getPooledTripsByTenant: (tenantId) => {
        return get().pooledTrips.filter((t) => t.tenantId === tenantId);
      },

      getPooledTripsByDate: (tenantId, date) => {
        return get().pooledTrips.filter((t) => t.tenantId === tenantId && t.date === date);
      },
    }),
    { name: "ride-pooling" }
  )
);
