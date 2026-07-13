"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnomalyType } from "@/lib/types";

export interface AnomalyEvent {
  id: string;
  tripId: string;
  vehicleIndex: number;
  vehicleId?: string;
  type: AnomalyType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  detectedAt: string;
  resolvedAt?: string;
  resolved: boolean;
}

export interface AnomalyConfig {
  /** Max allowed distance (km) from planned route before flagging deviation */
  deviationThresholdKm: number;
  /** Minutes vehicle can be stationary (speed=0, not at pickup/drop) before flagging */
  prolongedStopMinutes: number;
  /** Minutes after DRIVER_ACCEPTED before flagging no-show if not at pickup */
  noShowMinutes: number;
  /** Interval (ms) between anomaly check runs */
  checkIntervalMs: number;
  /** Whether anomaly detection is enabled */
  enabled: boolean;
}

interface AnomalyStore {
  events: AnomalyEvent[];
  config: AnomalyConfig;

  // Config
  updateConfig: (updates: Partial<AnomalyConfig>) => void;

  // Events
  addEvent: (event: Omit<AnomalyEvent, "id" | "detectedAt" | "resolved">) => void;
  resolveEvent: (id: string) => void;
  getActiveEvents: () => AnomalyEvent[];
  getUnresolvedEventsByType: (type: AnomalyType) => AnomalyEvent[];
  clearResolvedEvents: () => void;
}

const DEFAULT_CONFIG: AnomalyConfig = {
  deviationThresholdKm: 2,
  prolongedStopMinutes: 10,
  noShowMinutes: 15,
  checkIntervalMs: 15000, // Check every 15 seconds
  enabled: true,
};

export const useAnomalyStore = create<AnomalyStore>()(
  persist(
    (set, get) => ({
      events: [],
      config: DEFAULT_CONFIG,

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },

      addEvent: (event) => {
        const newEvent: AnomalyEvent = {
          ...event,
          id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          detectedAt: new Date().toISOString(),
          resolved: false,
        };
        set((state) => ({
          events: [newEvent, ...state.events].slice(0, 200), // Keep last 200 events
        }));
      },

      resolveEvent: (id) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, resolved: true, resolvedAt: new Date().toISOString() } : e
          ),
        }));
      },

      getActiveEvents: () => {
        return get().events.filter((e) => !e.resolved);
      },

      getUnresolvedEventsByType: (type) => {
        return get().events.filter((e) => e.type === type && !e.resolved);
      },

      clearResolvedEvents: () => {
        set((state) => ({
          events: state.events.filter((e) => !e.resolved),
        }));
      },
    }),
    { name: "ride-anomaly-detection" }
  )
);
