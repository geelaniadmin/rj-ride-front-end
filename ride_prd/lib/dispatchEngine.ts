import { useTripStore } from "@/stores/tripStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useDispatchStore, FleetPriority, DriverSelection } from "@/stores/dispatchStore";
import { useToastStore } from "@/stores/toastStore";
import { TripVehicle, Vehicle, Driver } from "@/lib/types";

export interface AutoAssignResult {
  success: boolean;
  assignments: Array<{
    tripId: string;
    vehicleIndex: number;
    vehicleId: string;
    driverId: string;
    vendorId: string;
    vehicleName: string;
    driverName: string;
  }>;
  failed: Array<{
    tripId: string;
    vehicleIndex: number;
    reason: string;
  }>;
  summary: string;
}

/**
 * Find all pending vehicles across trips that need assignment.
 * A vehicle needs assignment when:
 * - Status is PENDING or DRIVER_REJECTED
 * - No vehicleId (no vehicle assigned yet) OR no driverId
 */
function findPendingSlots(tenantId: string): Array<{ tripId: string; vehicleIndex: number; vehicle: TripVehicle }> {
  const tripStore = useTripStore.getState();
  const trips = tripStore.trips.filter((t) => t.tenantId === tenantId);

  const slots: Array<{ tripId: string; vehicleIndex: number; vehicle: TripVehicle }> = [];

  trips.forEach((trip) => {
    trip.vehicles.forEach((vehicle, idx) => {
      const needsAssignment =
        (vehicle.status === "PENDING" || vehicle.status === "DRIVER_REJECTED") &&
        (!vehicle.vehicleId || !vehicle.driverId);

      if (needsAssignment) {
        slots.push({ tripId: trip.id, vehicleIndex: idx, vehicle });
      }
    });
  });

  return slots;
}

/**
 * Get vehicles available for allocation across ALL vendors (own fleet + sub-vendors).
 * Excludes vehicles already assigned to active (non-completed, non-cancelled) trips
 * to prevent double-booking.
 */
function getAvailableVehicles(tenantId: string, requestedVehicleTypeId: string): Vehicle[] {
  const vehicleStore = useVehicleStore.getState();
  const tripStore = useTripStore.getState();

  // Find vehicles already assigned to active trips — prevents double-booking
  const assignedVehicleIds = new Set<string>();
  tripStore.trips
    .filter((t) => t.tenantId === tenantId && t.status !== "COMPLETED" && t.status !== "CANCELLED")
    .forEach((trip) => {
      trip.vehicles.forEach((v) => {
        if (v.vehicleId) {
          assignedVehicleIds.add(v.vehicleId);
        }
      });
    });

  return vehicleStore.vehicles.filter(
    (v) =>
      v.tenantId === tenantId &&
      v.active &&
      v.vehicleTypeId === requestedVehicleTypeId &&
      !assignedVehicleIds.has(v.id) // Prevent double-booking
  );
}

/**
 * Get available drivers for a given vendor, excluding drivers already assigned to active trips.
 */
function getAvailableDrivers(
  tenantId: string,
  vendorId: string,
  maxAssignmentsPerDriver: number,
  excludeDriverIds: Set<string>
): Driver[] {
  const driverStore = useDriverStore.getState();

  // Count current active assignments per driver
  const tripStore = useTripStore.getState();
  const activeAssignments = new Map<string, number>();

  tripStore.trips
    .filter((t) => t.tenantId === tenantId && t.status !== "COMPLETED" && t.status !== "CANCELLED")
    .forEach((trip) => {
      trip.vehicles.forEach((v) => {
        if (v.driverId) {
          activeAssignments.set(v.driverId, (activeAssignments.get(v.driverId) || 0) + 1);
        }
      });
    });

  return driverStore.drivers.filter((d) => {
    if (d.tenantId !== tenantId) return false;
    if (!d.available || !d.active) return false;
    if (d.vendorId !== vendorId) return false;
    if (excludeDriverIds.has(d.id)) return false;

    // Check max assignments per driver
    const currentAssignments = activeAssignments.get(d.id) || 0;
    if (currentAssignments >= maxAssignmentsPerDriver) return false;

    return true;
  });
}

/**
 * Sort vehicles based on fleet priority rule and AC preference.
 */
function sortVehiclesByFleetPriority(
  vehicles: Vehicle[],
  fleetPriority: FleetPriority,
  ownFleetVendorIds: string[],
  preferVehicleWithAC: boolean
): Vehicle[] {
  const sorted = [...vehicles];

  // Generic AC preference comparator — applied as secondary sort in all branches
  const acComparator = (a: Vehicle, b: Vehicle) => {
    if (!preferVehicleWithAC) return 0;
    if (a.ac && !b.ac) return -1;
    if (!a.ac && b.ac) return 1;
    return 0;
  };

  switch (fleetPriority) {
    case "OWN_FLEET_FIRST": {
      return sorted.sort((a, b) => {
        const aIsOwn = ownFleetVendorIds.includes(a.ownerVendorId);
        const bIsOwn = ownFleetVendorIds.includes(b.ownerVendorId);
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        return acComparator(a, b);
      });
    }
    case "SUB_VENDOR_FIRST": {
      return sorted.sort((a, b) => {
        const aIsOwn = ownFleetVendorIds.includes(a.ownerVendorId);
        const bIsOwn = ownFleetVendorIds.includes(b.ownerVendorId);
        if (!aIsOwn && bIsOwn) return -1;
        if (aIsOwn && !bIsOwn) return 1;
        return acComparator(a, b);
      });
    }
    case "COST_OPTIMIZED": {
      // Sub-vendors first (assumed cheaper for demo), then prefer newer/more efficient vehicles
      return sorted.sort((a, b) => {
        const aIsOwn = ownFleetVendorIds.includes(a.ownerVendorId);
        const bIsOwn = ownFleetVendorIds.includes(b.ownerVendorId);
        if (!aIsOwn && bIsOwn) return -1;
        if (aIsOwn && !bIsOwn) return 1;
        // Within same vendor, prefer fuel-efficient (CNG/EV over PETROL/DIESEL)
        const fuelOrder = { EV: 0, CNG: 1, PETROL: 2, DIESEL: 3 };
        const aFuel = fuelOrder[a.fuelType] ?? 4;
        const bFuel = fuelOrder[b.fuelType] ?? 4;
        if (aFuel !== bFuel) return aFuel - bFuel;
        return acComparator(a, b);
      });
    }
    case "ROUND_ROBIN": {
      // Shuffle to distribute across vendors evenly
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
      }
      // Still apply AC preference on top of shuffle
      if (preferVehicleWithAC) {
        sorted.sort((a, b) => {
          if (a.ac && !b.ac) return -1;
          if (!a.ac && b.ac) return 1;
          return 0;
        });
      }
      return sorted;
    }
    default:
      return sorted;
  }
}

/**
 * Sort drivers based on selection rule.
 */
function sortDriversBySelection(
  drivers: Driver[],
  driverSelection: DriverSelection
): Driver[] {
  const sorted = [...drivers];

  switch (driverSelection) {
    case "RATING": {
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    case "AVAILABILITY": {
      // Most recently available first (available flag is already filtered)
      return sorted;
    }
    case "LANGUAGE_MATCH": {
      // Drivers with more languages first (more likely to match passenger)
      return sorted.sort((a, b) => (b.languages?.length || 0) - (a.languages?.length || 0));
    }
    case "ROUND_ROBIN": {
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
      }
      return sorted;
    }
    default:
      return sorted;
  }
}

/**
 * Execute auto-dispatch: scan for pending vehicles and auto-assign the best
 * available vehicle + driver based on the active dispatch rules.
 */
export function executeAutoDispatch(tenantId: string): AutoAssignResult {
  const tripStore = useTripStore.getState();
  const dispatchStore = useDispatchStore.getState();
  const vendorStore = useVendorStore.getState();

  const activeRule = dispatchStore.getActiveRule();
  if (!activeRule) {
    return {
      success: false,
      assignments: [],
      failed: [],
      summary: "No active dispatch rule configured.",
    };
  }

  // Find own fleet vendor IDs (SELF type)
  const ownFleetVendorIds = vendorStore.vendors
    .filter((v) => v.tenantId === tenantId && v.type === "SELF" && v.active)
    .map((v) => v.id);

  // Find pending slots
  const pendingSlots = findPendingSlots(tenantId);
  if (pendingSlots.length === 0) {
    return {
      success: true,
      assignments: [],
      failed: [],
      summary: "No pending vehicles found for auto-assignment.",
    };
  }

  const assignments: AutoAssignResult["assignments"] = [];
  const failed: AutoAssignResult["failed"] = [];
  const usedDriverIds = new Set<string>();

  for (const slot of pendingSlots) {
    const { tripId, vehicleIndex, vehicle } = slot;

    try {
      // 1. Find available vehicles of the requested type
      const availableVehicles = getAvailableVehicles(tenantId, vehicle.requestedVehicleTypeId);

      if (availableVehicles.length === 0) {
        failed.push({
          tripId,
          vehicleIndex,
          reason: `No available vehicles of type "${vehicle.requestedVehicleTypeId}"`,
        });
        continue;
      }

      // 2. Sort vehicles by fleet priority rule (including AC preference)
      const sortedVehicles = sortVehiclesByFleetPriority(
        availableVehicles,
        activeRule.fleetPriority,
        ownFleetVendorIds,
        activeRule.preferVehicleWithAC
      );

      // 3. Try each vehicle until we find one with an available driver
      let assigned = false;

      for (const candidateVehicle of sortedVehicles) {
        if (assigned) break;

        const vendorId = candidateVehicle.ownerVendorId;

        // 4. Find available drivers for this vehicle's vendor
        const availableDrivers = getAvailableDrivers(
          tenantId,
          vendorId,
          activeRule.maxAssignmentsPerDriver,
          usedDriverIds
        );

        if (availableDrivers.length === 0) continue;

        // 5. Pick the best driver based on selection rule
        const sortedDrivers = sortDriversBySelection(availableDrivers, activeRule.driverSelection);
        const selectedDriver = sortedDrivers[0]!;

        // 6. Perform the assignment
        const updatedVehicles = tripStore.trips
          .find((t) => t.id === tripId)
          ?.vehicles.map((v, i) =>
            i === vehicleIndex
              ? {
                  ...v,
                  vehicleId: candidateVehicle.id,
                  driverId: selectedDriver.id,
                  vendorId: vendorId,
                  status: "ASSIGNED" as const,
                }
              : v
          );

        if (updatedVehicles) {
          tripStore.updateTrip(tripId, { vehicles: updatedVehicles });
        }

        usedDriverIds.add(selectedDriver.id);

        assignments.push({
          tripId,
          vehicleIndex,
          vehicleId: candidateVehicle.id,
          driverId: selectedDriver.id,
          vendorId: vendorId,
          vehicleName: `${candidateVehicle.make} ${candidateVehicle.model} (${candidateVehicle.registrationNo})`,
          driverName: selectedDriver.name,
        });

        // Record allocation
        dispatchStore.addAllocation({
          tripId,
          vehicleIndex,
          requestedVehicleTypeId: vehicle.requestedVehicleTypeId,
          vendorId,
          assignedVehicleId: candidateVehicle.id,
          assignedDriverId: selectedDriver.id,
          status: "ASSIGNED",
        });

        assigned = true;
      }

      if (!assigned) {
        failed.push({
          tripId,
          vehicleIndex,
          reason: `No available driver for any vehicle of type "${vehicle.requestedVehicleTypeId}"`,
        });
        dispatchStore.addAllocation({
          tripId,
          vehicleIndex,
          requestedVehicleTypeId: vehicle.requestedVehicleTypeId,
          status: "FAILED",
          failedReason: "No available driver",
        });
      }
    } catch (err) {
      failed.push({
        tripId,
        vehicleIndex,
        reason: err instanceof Error ? err.message : "Unknown error during assignment",
      });
    }
  }

  const total = pendingSlots.length;
  const assigned = assignments.length;

  return {
    success: assigned > 0 || failed.length === 0,
    assignments,
    failed,
    summary: `Auto-dispatch complete: ${assigned}/${total} vehicles assigned using rule "${activeRule.name}". ${failed.length} failed.`,
  };
}

/**
 * Auto-assign all pending vehicles for a specific trip.
 */
export function autoAssignTrip(tenantId: string, tripId: string): AutoAssignResult {
  // Filter to only this trip's pending slots
  const tripStore = useTripStore.getState();
  const trip = tripStore.getTripById(tripId);

  if (!trip) {
    return {
      success: false,
      assignments: [],
      failed: [{ tripId, vehicleIndex: 0, reason: "Trip not found" }],
      summary: "Trip not found.",
    };
  }

  // Run full dispatch and filter results to this trip
  const fullResult = executeAutoDispatch(tenantId);

  const tripAssignments = fullResult.assignments.filter((a) => a.tripId === tripId);
  const tripFailed = fullResult.failed.filter((f) => f.tripId === tripId);

  return {
    success: tripAssignments.length > 0,
    assignments: tripAssignments,
    failed: tripFailed,
    summary: `Trip auto-assign: ${tripAssignments.length} vehicles assigned. ${tripFailed.length} failed.`,
  };
}
