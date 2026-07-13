import { Employee, Stop, SafetyConstraint, VehicleTypeConfig, PooledTrip, PoolingConfig, PoolingStatus } from "@/lib/types";
import { id } from "@/lib/mock";

// ── Helpers ──

/** Haversine distance between two points in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimated travel time in minutes between two points at avg 30 km/h */
function travelTimeMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return (haversineKm(lat1, lng1, lat2, lng2) / 30) * 60;
}

/** Compute total route distance for a sequence of stops */
function totalRouteDistance(stops: Array<{ lat: number; lng: number }>): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineKm(stops[i]!.lat, stops[i]!.lng, stops[i + 1]!.lat, stops[i + 1]!.lng);
  }
  return total;
}

/** Compute total route duration in minutes */
function totalRouteDuration(stops: Array<{ lat: number; lng: number }>): number {
  let total = 0;
  // Travel time between stops
  for (let i = 0; i < stops.length - 1; i++) {
    total += travelTimeMinutes(stops[i]!.lat, stops[i]!.lng, stops[i + 1]!.lat, stops[i + 1]!.lng);
  }
  // Add 2 min per stop for pickup
  total += (stops.length - 1) * 2;
  return Math.ceil(total);
}

// ── Clustering ──

export interface ClusterResult {
  employees: Employee[];
  officeStop: Stop;
  homeStops: Stop[];
  totalDistance: number;
  estimatedDuration: number;
  safetyIssues: string[];
  safetyChecksPassed: boolean;
}

/**
 * Cluster employees by office zone and shift into shared trips.
 * Groups employees who share the same office zone and shift.
 */
export function clusterByOfficeAndShift(
  employees: Employee[]
): Map<string, Employee[]> {
  const clusters = new Map<string, Employee[]>();

  for (const emp of employees) {
    const key = `${emp.officeZone || "NO_ZONE"}-${emp.shift}`;
    const existing = clusters.get(key) || [];
    existing.push(emp);
    clusters.set(key, existing);
  }

  return clusters;
}

/**
 * Optimize the order of home stops for a pooled route.
 * Uses nearest-neighbor heuristic to minimize total travel distance.
 * Office is always the first stop (pickup), then homes in optimized order.
 */
export function optimizeRouteStops(
  officeStop: Stop,
  employees: Employee[]
): Stop[] {
  const stops: Stop[] = [officeStop];

  // Nearest-neighbor optimization
  const remaining = [...employees];
  let currentLat = officeStop.lat;
  let currentLng = officeStop.lng;

  while (remaining.length > 0) {
    // Find nearest employee's home
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const emp = remaining[i]!;
      const dist = haversineKm(currentLat, currentLng, emp.homeLat, emp.homeLng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0]!;
    stops.push({
      seq: stops.length,
      type: "DROP",
      locationType: "ADDRESS",
      address: nearest.homeAddress,
      lat: nearest.homeLat,
      lng: nearest.homeLng,
      plannedTime: undefined,
    });
    currentLat = nearest.homeLat;
    currentLng = nearest.homeLng;
  }

  return stops;
}

/**
 * Check safety constraints for a pooled trip.
 * Returns issues (if any) and whether all checks passed.
 */
export function checkSafetyConstraints(
  employees: Employee[],
  stops: Stop[],
  constraints: SafetyConstraint[],
  shift: string
): { issues: string[]; passed: boolean } {
  const issues: string[] = [];

  for (const c of constraints) {
    if (!c.enabled) continue;

    switch (c.type) {
      case "NO_LONE_FEMALE_LAST_DROP": {
        // Last employee dropped off should not be a lone female
        const femaleEmp = employees.filter((e) => e.gender === "FEMALE");
        if (femaleEmp.length === 1) {
          // Check if she's the last drop — her home should be the last stop
          const lastStop = stops[stops.length - 1];
          const loneFemale = femaleEmp[0]!;
          if (lastStop && lastStop.lat === loneFemale.homeLat && lastStop.lng === loneFemale.homeLng) {
            issues.push("Safety: Last drop is a lone female employee");
          }
        }
        break;
      }

      case "SAME_GENDER_PREFERRED": {
        const genders = new Set(employees.map((e) => e.gender));
        if (genders.size > 1 && genders.has("FEMALE")) {
          issues.push("Safety: Mixed genders in vehicle — consider same-gender grouping");
        }
        break;
      }

      case "NIGHT_SHIFT_ESCORT": {
        if (shift === "NIGHT") {
          const femaleCount = employees.filter((e) => e.gender === "FEMALE").length;
          if (femaleCount > 0 && employees.length < 2) {
            issues.push("Safety: Night shift female employee should have an escort");
          }
        }
        break;
      }

      case "MAX_TRAVEL_TIME": {
        const maxMinutes = (c.params?.maxMinutes as number) || 90;
        const duration = totalRouteDuration(stops);
        if (duration > maxMinutes) {
          issues.push(`Safety: Estimated travel time (${Math.round(duration)} min) exceeds max (${maxMinutes} min)`);
        }
        break;
      }

      case "NO_OVERNIGHT_ALONE": {
        if (shift === "NIGHT" && employees.length === 1) {
          issues.push("Safety: Single employee on night shift — consider pairing");
        }
        break;
      }
    }
  }

  return {
    issues,
    passed: issues.length === 0,
  };
}

/**
 * Check if a set of employees fits within the vehicle's capacity.
 */
export function checkCapacity(
  employees: Employee[],
  vehicleType: VehicleTypeConfig
): { fits: boolean; remaining: number } {
  const remaining = vehicleType.seatingCapacity - employees.length;
  return {
    fits: remaining >= 0,
    remaining,
  };
}

/**
 * Split a cluster into sub-clusters that fit within capacity.
 */
export function splitByCapacity(
  employees: Employee[],
  vehicleType: VehicleTypeConfig
): Employee[][] {
  const groups: Employee[][] = [];
  for (let i = 0; i < employees.length; i += vehicleType.seatingCapacity) {
    groups.push(employees.slice(i, i + vehicleType.seatingCapacity));
  }
  return groups;
}

/**
 * Generate pooled trip plan from a cluster of employees.
 */
export function generatePooledTrip(
  tenantId: string,
  config: PoolingConfig,
  employees: Employee[],
  vehicleType: VehicleTypeConfig,
  date: string,
  shift: string,
  officeZone: string
): { trip: Omit<PooledTrip, "id" | "createdAt" | "updatedAt"> | null; errors: string[] } {
  const errors: string[] = [];

  // 1. Check capacity — split if needed
  if (employees.length > vehicleType.seatingCapacity) {
    errors.push(`Too many employees (${employees.length}) for vehicle capacity (${vehicleType.seatingCapacity})`);
    return { trip: null, errors };
  }

  const capacityCheck = checkCapacity(employees, vehicleType);
  if (!capacityCheck.fits) {
    errors.push(`Vehicle capacity exceeded by ${Math.abs(capacityCheck.remaining)}`);
    return { trip: null, errors };
  }

  // 2. Build office stop (use first employee's office as pickup)
  const officeEmployee = employees[0]!;
  const officeStop: Stop = {
    seq: 0,
    type: "PICKUP",
    locationType: "ADDRESS",
    address: officeEmployee.officeAddress,
    lat: officeEmployee.officeLat,
    lng: officeEmployee.officeLng,
  };

  // 3. Optimize route
  const stops = optimizeRouteStops(officeStop, employees);

  // 4. Check safety constraints
  const safetyCheck = checkSafetyConstraints(
    employees,
    stops,
    config.safetyConstraints,
    shift
  );

  // 5. Compute route stats
  const totalDist = totalRouteDistance(stops);
  const totalDur = totalRouteDuration(stops);

  // 6. Check max detour
  if (config.maxDetourPercent > 0) {
    const directDist = employees.reduce((sum, emp) => {
      return sum + haversineKm(officeStop.lat, officeStop.lng, emp.homeLat, emp.homeLng);
    }, 0);
    const detourRatio = totalDist / Math.max(directDist, 0.1);
    if (detourRatio > 1 + config.maxDetourPercent / 100) {
      errors.push(`Detour (${(detourRatio - 1) * 100}%) exceeds max detour (${config.maxDetourPercent}%)`);
      return { trip: null, errors };
    }
  }

  return {
    trip: {
      tenantId,
      configId: config.id,
      date,
      shift: shift as any,
      officeZone,
      status: "PLANNED" as PoolingStatus,
      stops,
      employees,
      vehicleTypeId: config.vehicleTypeId,
      totalDistance: totalDist,
      estimatedDuration: totalDur,
      safetyChecksPassed: safetyCheck.passed,
      safetyIssues: safetyCheck.issues,
    },
    errors,
  };
}

/**
 * Run full pooling for a date: cluster employees, split by capacity, generate pooled trips.
 */
export function runPooling(
  tenantId: string,
  employees: Employee[],
  config: PoolingConfig,
  vehicleType: VehicleTypeConfig,
  date: string
): Array<{ trip: Omit<PooledTrip, "id" | "createdAt" | "updatedAt"> | null; errors: string[] }> {
  const results: Array<{ trip: any; errors: string[] }> = [];

  // Cluster by office zone + shift
  const clusters = clusterByOfficeAndShift(employees);

  for (const [key, clusterEmployees] of clusters.entries()) {
    const [officeZone, shift] = key.split("-");

    // Split large clusters by capacity
    const groups = splitByCapacity(clusterEmployees, vehicleType);

    for (const group of groups) {
      const result = generatePooledTrip(
        tenantId,
        config,
        group,
        vehicleType,
        date,
        shift || "DAY",
        officeZone || "NO_ZONE"
      );
      results.push(result);
    }
  }

  return results;
}
