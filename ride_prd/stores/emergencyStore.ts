"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EscalationTree, EscalationStep, EmergencyEvent, EmergencyTimelineEntry, EscalationLevel } from "@/lib/types";
import { id } from "@/lib/mock";
import { useAlertStore } from "@ride/shared";

const DEFAULT_ESCALATION_TREE: EscalationTree = {
  id: "esc-default",
  tenantId: "T1",
  name: "Default Escalation",
  active: true,
  steps: [
    {
      level: "DRIVER",
      label: "Driver Acknowledgment",
      contact: "Driver in-vehicle",
      timeoutMinutes: 2,
      actions: ["Acknowledge SOS", "Confirm location", "Check passenger safety"],
    },
    {
      level: "DISPATCHER",
      label: "Dispatch Intervention",
      contact: "dispatch@ride.local",
      timeoutMinutes: 5,
      actions: ["Contact driver", "Contact passenger SPOC", "Decide vehicle swap"],
    },
    {
      level: "SPOC",
      label: "Customer SPOC Notification",
      contact: "spoc@customer.local",
      timeoutMinutes: 10,
      actions: ["Notify customer SPOC", "Share incident summary", "Coordinate response"],
    },
    {
      level: "AUTHORITIES",
      label: "Authorities Escalation",
      contact: "112 / local police",
      timeoutMinutes: 30,
      actions: ["Alert emergency services", "Share GPS coordinates", "Provide passenger manifest"],
    },
  ],
};

interface EmergencyStore {
  escalationTrees: EscalationTree[];
  activeEmergencies: EmergencyEvent[];

  // Escalation tree management
  addEscalationTree: (tree: Omit<EscalationTree, "id">) => void;
  updateEscalationTree: (id: string, updates: Partial<EscalationTree>) => void;
  setActiveEscalationTree: (id: string) => void;
  getActiveTree: () => EscalationTree | undefined;

  // Emergency event management
  createEmergency: (event: Omit<EmergencyEvent, "id" | "timeline" | "status" | "currentLevel" | "createdAt">) => string;
  addTimelineEntry: (emergencyId: string, entry: Omit<EmergencyTimelineEntry, "id" | "createdAt">) => void;
  escalate: (emergencyId: string, notes?: string) => void;
  resolveEmergency: (emergencyId: string, notes?: string) => void;
  getTimeline: (emergencyId: string) => EmergencyTimelineEntry[];
  getActiveEmergenciesByTenant: (tenantId: string) => EmergencyEvent[];
}

export const useEmergencyStore = create<EmergencyStore>()(
  persist(
    (set, get) => ({
      escalationTrees: [DEFAULT_ESCALATION_TREE],
      activeEmergencies: [],

      addEscalationTree: (tree) => {
        const newTree: EscalationTree = { ...tree, id: id() };
        set((state) => ({ escalationTrees: [...state.escalationTrees, newTree] }));
      },

      updateEscalationTree: (id, updates) => {
        set((state) => ({
          escalationTrees: state.escalationTrees.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      setActiveEscalationTree: (id) => {
        set((state) => ({
          escalationTrees: state.escalationTrees.map((t) => ({
            ...t,
            active: t.id === id,
          })),
        }));
      },

      getActiveTree: () => {
        return get().escalationTrees.find((t) => t.active);
      },

      createEmergency: (event) => {
        const emergencyId = id();
        const escalationTree = get().getActiveTree();
        const firstStep = escalationTree?.steps[0];

        const newEmergency: EmergencyEvent = {
          ...event,
          id: emergencyId,
          status: "OPEN",
          currentLevel: firstStep?.level || "DRIVER",
          timeline: [],
          createdAt: new Date().toISOString(),
        };

        // Add initial timeline entry
        const initialEntry: EmergencyTimelineEntry = {
          id: id(),
          emergencyId,
          level: firstStep?.level || "DRIVER",
          action: "Emergency raised",
          notes: event.message,
          createdAt: new Date().toISOString(),
        };

        newEmergency.timeline = [initialEntry];

        set((state) => ({
          activeEmergencies: [...state.activeEmergencies, newEmergency],
        }));

        // Also create an alert
        useAlertStore.getState().addAlert({
          tenantId: event.tenantId,
          type: "SOS_RAISED",
          severity: event.severity === "CRITICAL" ? "critical" : "HIGH",
          message: `[${event.type}] ${event.message} — Escalation: ${firstStep?.level || "DRIVER"}`,
          tripId: event.tripId,
          vendorId: "",
          read: false,
        });

        return emergencyId;
      },

      addTimelineEntry: (emergencyId, entry) => {
        const fullEntry: EmergencyTimelineEntry = {
          ...entry,
          id: id(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          activeEmergencies: state.activeEmergencies.map((e) =>
            e.id === emergencyId
              ? { ...e, timeline: [...e.timeline, fullEntry] }
              : e
          ),
        }));
      },

      escalate: (emergencyId, notes) => {
        const emergency = get().activeEmergencies.find((e) => e.id === emergencyId);
        if (!emergency) return;

        const tree = get().getActiveTree();
        if (!tree) return;

        const currentIdx = tree.steps.findIndex((s) => s.level === emergency.currentLevel);
        const nextStep = tree.steps[currentIdx + 1];

        if (!nextStep) {
          // Already at max escalation — mark as resolved
          get().resolveEmergency(emergencyId, "Max escalation level reached");
          return;
        }

        const entry: EmergencyTimelineEntry = {
          id: id(),
          emergencyId,
          level: nextStep.level,
          action: `Escalated to ${nextStep.label}`,
          notes: notes || `Auto-escalated after timeout. Contact: ${nextStep.contact}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          activeEmergencies: state.activeEmergencies.map((e) =>
            e.id === emergencyId
              ? { ...e, currentLevel: nextStep.level, status: "ESCALATING", timeline: [...e.timeline, entry] }
              : e
          ),
        }));
      },

      resolveEmergency: (emergencyId, notes) => {
        const entry: EmergencyTimelineEntry = {
          id: id(),
          emergencyId,
          level: "AUTHORITIES",
          action: "Emergency resolved",
          notes: notes || "Resolved by dispatcher",
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          activeEmergencies: state.activeEmergencies.map((e) =>
            e.id === emergencyId
              ? { ...e, status: "RESOLVED", resolvedAt: new Date().toISOString(), timeline: [...e.timeline, entry] }
              : e
          ),
        }));

        // Log resolution
        useAlertStore.getState().addAlert({
          tenantId: emergencyId,
          type: "TRIP_ISSUE",
          severity: "LOW",
          message: `Emergency ${emergencyId.slice(0, 8)} resolved. ${notes || ""}`,
          tripId: "",
          vendorId: "",
          read: false,
        });
      },

      getTimeline: (emergencyId) => {
        const emergency = get().activeEmergencies.find((e) => e.id === emergencyId);
        return emergency?.timeline || [];
      },

      getActiveEmergenciesByTenant: (tenantId) => {
        return get().activeEmergencies.filter((e) => e.tenantId === tenantId && e.status !== "RESOLVED");
      },
    }),
    { name: "ride-emergency" }
  )
);
