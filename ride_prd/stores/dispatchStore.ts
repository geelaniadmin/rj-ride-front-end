"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FleetPriority = "OWN_FLEET_FIRST" | "SUB_VENDOR_FIRST" | "ROUND_ROBIN" | "COST_OPTIMIZED";
export type DriverSelection = "RATING" | "AVAILABILITY" | "LANGUAGE_MATCH" | "ROUND_ROBIN";

export interface DispatchRule {
  id: string;
  name: string;
  fleetPriority: FleetPriority;
  driverSelection: DriverSelection;
  maxAssignmentsPerDriver: number;
  preferVehicleWithAC: boolean;
}

export interface TripAllocation {
  tripId: string;
  vehicleIndex: number;
  requestedVehicleTypeId: string;
  vendorId?: string;
  assignedVehicleId?: string;
  assignedDriverId?: string;
  status: "PENDING" | "ASSIGNED" | "FAILED";
  failedReason?: string;
}

interface DispatchStore {
  rules: DispatchRule[];
  allocationHistory: TripAllocation[];
  activeRuleId: string;

  // Rules
  addRule: (rule: Omit<DispatchRule, "id">) => void;
  updateRule: (id: string, updates: Partial<DispatchRule>) => void;
  removeRule: (id: string) => void;
  setActiveRule: (id: string) => void;
  getActiveRule: () => DispatchRule | undefined;

  // Allocation history
  addAllocation: (allocation: TripAllocation) => void;
  clearAllocationHistory: () => void;
}

const DEFAULT_RULES: DispatchRule[] = [
  {
    id: "rule-balanced",
    name: "Balanced (Own Fleet First, Top Rated Drivers)",
    fleetPriority: "OWN_FLEET_FIRST",
    driverSelection: "RATING",
    maxAssignmentsPerDriver: 1,
    preferVehicleWithAC: true,
  },
  {
    id: "rule-cost-optimized",
    name: "Cost Optimized (Sub-Vendors First)",
    fleetPriority: "COST_OPTIMIZED",
    driverSelection: "AVAILABILITY",
    maxAssignmentsPerDriver: 2,
    preferVehicleWithAC: false,
  },
  {
    id: "rule-round-robin",
    name: "Round Robin (Balance Across Vendors)",
    fleetPriority: "ROUND_ROBIN",
    driverSelection: "ROUND_ROBIN",
    maxAssignmentsPerDriver: 1,
    preferVehicleWithAC: true,
  },
];

export const useDispatchStore = create<DispatchStore>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      allocationHistory: [],
      activeRuleId: "rule-balanced",

      addRule: (rule) => {
        const id = `rule-${Date.now()}`;
        set((state) => ({
          rules: [...state.rules, { ...rule, id }],
        }));
      },

      updateRule: (id, updates) => {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        // If the active rule was updated but still exists, keep it active
      },

      removeRule: (id) => {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        }));
      },

      setActiveRule: (id) => {
        set({ activeRuleId: id });
      },

      getActiveRule: () => {
        return get().rules.find((r) => r.id === get().activeRuleId);
      },

      addAllocation: (allocation) => {
        set((state) => ({
          allocationHistory: [...state.allocationHistory, allocation],
        }));
      },

      clearAllocationHistory: () => {
        set({ allocationHistory: [] });
      },
    }),
    { name: "ride-dispatch-rules" }
  )
);
