'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SafetyAlertType = 'SOS' | 'ROUTE_DEVIATION' | 'NO_SHOW' | 'PROLONGED_STOP';
export type SafetyAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
export type EscalationLevel = 1 | 2 | 3 | 4;

export interface SafetyTimeline {
  level: EscalationLevel;
  label: string;
  actor: string;
  status: 'done' | 'active' | 'pending';
  timestamp?: string;
}

export interface SafetyAlert {
  id: string;
  type: SafetyAlertType;
  status: SafetyAlertStatus;
  tripId: string;
  vehicleId?: string;
  driverId?: string;
  message: string;
  location?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  acknowledgedBy?: string;
  resolvedBy?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  escalationLevel: EscalationLevel;
  timeline: SafetyTimeline[];
  paxName?: string;
  vehiclePlate?: string;
  deviationMeters?: number;
  stopDuration?: number;
  tenantId: string;
}

interface SafetyAlertStore {
  safetyAlerts: SafetyAlert[];
  addSafetyAlert: (alert: Omit<SafetyAlert, 'id'>) => void;
  acknowledgeSafetyAlert: (id: string, by: string) => void;
  resolveSafetyAlert: (id: string, by: string) => void;
  dismissSafetyAlert: (id: string) => void;
  escalateSafetyAlert: (id: string) => void;
  getAlertsByTenant: (tenantId: string, tripIds: string[]) => SafetyAlert[];
  getActiveAlerts: (tripIds: string[]) => SafetyAlert[];
}

export const useSafetyAlertStore = create<SafetyAlertStore>()(
  persist(
    (set, get) => ({
      safetyAlerts: [],
      addSafetyAlert: (alert) => {
        set((state) => ({
          safetyAlerts: [...state.safetyAlerts, { ...alert, id: crypto.randomUUID() }],
        }));
      },
      acknowledgeSafetyAlert: (id, by) => {
        set((state) => ({
          safetyAlerts: state.safetyAlerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'ACKNOWLEDGED' as SafetyAlertStatus,
                  acknowledgedBy: by,
                  acknowledgedAt: new Date().toISOString(),
                  timeline: a.timeline.map((t) => (t.level === 3 ? { ...t, status: 'done' as const } : t)),
                }
              : a
          ),
        }));
      },
      resolveSafetyAlert: (id, by) => {
        set((state) => ({
          safetyAlerts: state.safetyAlerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'RESOLVED' as SafetyAlertStatus,
                  resolvedBy: by,
                  resolvedAt: new Date().toISOString(),
                }
              : a
          ),
        }));
      },
      dismissSafetyAlert: (id: string) => {
        set((state) => ({
          safetyAlerts: state.safetyAlerts.filter((a) => a.id !== id),
        }));
      },
      escalateSafetyAlert: (id) => {
        set((state) => ({
          safetyAlerts: state.safetyAlerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  escalationLevel: Math.min(4, a.escalationLevel + 1) as EscalationLevel,
                  status: 'ESCALATED' as SafetyAlertStatus,
                }
              : a
          ),
        }));
      },
      getAlertsByTenant: (tenantId, tripIds) =>
        get().safetyAlerts.filter((a) => a.tenantId === tenantId && tripIds.includes(a.tripId)),
      getActiveAlerts: (tripIds) =>
        get().safetyAlerts.filter((a) => a.status === 'ACTIVE' && tripIds.includes(a.tripId)),
    }),
    { name: 'ride-safety-alerts' }
  )
);
