import { useTripStore } from "@/stores/tripStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useAnomalyStore, AnomalyEvent } from "@/stores/anomalyStore";
import type { AnomalyType } from "@/lib/types";
import { useAlertStore } from "@ride/shared";
import { getTraccarSimulator } from "@/lib/mock/traccar";

// ── Helpers ──

/** Haversine distance in km between two lat/lng points */
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

/** Minimum distance from a point to a polyline (simplified: min distance to any segment) */
function minDistanceToRouteKm(
  pointLat: number,
  pointLng: number,
  stops: Array<{ lat: number; lng: number }>
): number {
  if (stops.length === 0) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    // Distance from point to line segment a-b
    const d = pointToSegmentKm(pointLat, pointLng, a.lat, a.lng, b.lat, b.lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** Distance from point to line segment (approximate) */
function pointToSegmentKm(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineKm(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestLat = ax + t * dx;
  const closestLng = ay + t * dy;
  return haversineKm(px, py, closestLat, closestLng);
}

// ── Vehicle stop-state tracking ──

/** Tracks how long each vehicle has been stationary */
const stationaryTimers = new Map<string, { lastMovingTime: number; stationarySince: number }>();

/** Prune stale entries from tracking maps to prevent memory leaks */
function pruneTrackingMaps(activeVehicleIds: Set<string>) {
  for (const key of stationaryTimers.keys()) {
    if (!activeVehicleIds.has(key)) stationaryTimers.delete(key);
  }
  // noShowTimers uses tripId-index keys — prune by checking against active trips
  const activeTrips = useTripStore.getState().trips.filter(
    (t) => ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
  );
  const activeKeys = new Set<string>();
  for (const trip of activeTrips) {
    for (let i = 0; i < trip.vehicles.length; i++) {
      activeKeys.add(`${trip.id}-${i}`);
    }
  }
  for (const key of noShowTimers.keys()) {
    if (!activeKeys.has(key)) noShowTimers.delete(key);
  }
}

function updateStationaryTimer(
  vehicleId: string,
  isMoving: boolean,
  now: number
): number | null {
  const state = stationaryTimers.get(vehicleId) || {
    lastMovingTime: now,
    stationarySince: now,
  };

  if (isMoving) {
    state.lastMovingTime = now;
    state.stationarySince = now;
  } else {
    // Only start counting if stationarySince hasn't been set
    state.stationarySince = state.stationarySince || now;
  }

  stationaryTimers.set(vehicleId, state);

  if (!isMoving) {
    return (now - state.stationarySince) / 1000 / 60; // minutes stationary
  }
  return null;
}

/** Tracks no-show timing per trip-vehicle (stores first-detection timestamp) */
const noShowTimers = new Map<string, number>();

function updateNoShowTimer(key: string, now: number): number | null {
  if (!noShowTimers.has(key)) {
    noShowTimers.set(key, now); // Start counting from first detection
  }
  const startTime = noShowTimers.get(key)!;
  const elapsedMinutes = (now - startTime) / 1000 / 60;
  return elapsedMinutes;
}

// ── Anomaly Checks ──

export interface AnomalyCheckResult {
  events: Array<{
    type: AnomalyType;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    message: string;
    vehicleId?: string;
  }>;
}

/**
 * Check for route deviation: vehicle position is too far from the planned route.
 */
function checkRouteDeviation(
  tenantId: string,
  config: { deviationThresholdKm: number }
): AnomalyCheckResult {
  const events: AnomalyCheckResult["events"] = [];
  const tripStore = useTripStore.getState();
  const traccar = getTraccarSimulator();

  const activeTrips = tripStore.trips.filter(
    (t) => t.tenantId === tenantId && ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
  );

  for (const trip of activeTrips) {
    for (const vehicle of trip.vehicles) {
      if (!vehicle.vehicleId) continue;

      // Only check vehicles in motion states
      if (!["EN_ROUTE_PICKUP", "IN_TRANSIT"].includes(vehicle.status)) continue;

      const pos = traccar.getPosition(vehicle.vehicleId);
      if (!pos) continue;

      const dist = minDistanceToRouteKm(pos.lat, pos.lng, trip.stops);

      if (dist > config.deviationThresholdKm) {
        events.push({
          type: "ROUTE_DEVIATION",
          severity: dist > config.deviationThresholdKm * 3 ? "HIGH" : "MEDIUM",
          message: `Vehicle ${vehicle.vehicleId.slice(0, 8)} is ${dist.toFixed(1)}km off route (threshold: ${config.deviationThresholdKm}km)`,
          vehicleId: vehicle.vehicleId,
        });
      }
    }
  }

  return { events };
}

/**
 * Check for prolonged stop: vehicle is stationary for too long while in an active state.
 */
function checkProlongedStop(
  tenantId: string,
  config: { prolongedStopMinutes: number }
): AnomalyCheckResult {
  const events: AnomalyCheckResult["events"] = [];
  const tripStore = useTripStore.getState();
  const traccar = getTraccarSimulator();
  const now = Date.now();

  const activeTrips = tripStore.trips.filter(
    (t) => t.tenantId === tenantId && ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
  );

  // Track active vehicle IDs for pruning stale timers
  const activeVehicleIds = new Set<string>();

  for (const trip of activeTrips) {
    for (const vehicle of trip.vehicles) {
      if (!vehicle.vehicleId) continue;
      activeVehicleIds.add(vehicle.vehicleId);

      // Only check vehicles that should be moving
      if (!["EN_ROUTE_PICKUP", "IN_TRANSIT"].includes(vehicle.status)) continue;

      const pos = traccar.getPosition(vehicle.vehicleId);
      if (!pos) continue;

      const isMoving = pos.speed > 2; // > 2 km/h = moving
      const stationaryMinutes = updateStationaryTimer(vehicle.vehicleId, isMoving, now);

      if (stationaryMinutes !== null && stationaryMinutes >= config.prolongedStopMinutes) {
        const severity =
          stationaryMinutes >= config.prolongedStopMinutes * 3 ? "HIGH" :
          stationaryMinutes >= config.prolongedStopMinutes * 2 ? "MEDIUM" : "LOW";

        events.push({
          type: "PROLONGED_STOP",
          severity,
          message: `Vehicle ${vehicle.vehicleId.slice(0, 8)} has been stationary for ${Math.round(stationaryMinutes)} min (threshold: ${config.prolongedStopMinutes} min)`,
          vehicleId: vehicle.vehicleId,
        });
      }
    }
  }

  // Prune stale entries from tracking maps
  pruneTrackingMaps(activeVehicleIds);

  return { events };
}

/**
 * Check for no-show: driver hasn't arrived at pickup within the no-show window
 * after the driver accepted the trip.
 */
function checkNoShow(
  tenantId: string,
  config: { noShowMinutes: number }
): AnomalyCheckResult {
  const events: AnomalyCheckResult["events"] = [];
  const tripStore = useTripStore.getState();
  const now = Date.now();

  const activeTrips = tripStore.trips.filter(
    (t) => t.tenantId === tenantId && ["ASSIGNED", "IN_PROGRESS"].includes(t.status)
  );

  for (const trip of activeTrips) {
    for (const [idx, vehicle] of trip.vehicles.entries()) {
      // Only check vehicles that have accepted but haven't arrived at pickup
      if (vehicle.status !== "DRIVER_ACCEPTED" && vehicle.status !== "EN_ROUTE_PICKUP") continue;

      // If OTP already verified at pickup, no-show is not possible
      if (vehicle.otp?.pickupVerified) continue;

      const key = `${trip.id}-${idx}`;
      const elapsedMinutes = updateNoShowTimer(key, now);

      if (elapsedMinutes !== null && elapsedMinutes >= config.noShowMinutes) {
        events.push({
          type: "NO_SHOW",
          severity: elapsedMinutes >= config.noShowMinutes * 2 ? "CRITICAL" : "HIGH",
          message: `Driver for trip ${trip.id.slice(0, 8)} has not arrived at pickup after ${Math.round(elapsedMinutes)} min (threshold: ${config.noShowMinutes} min)`,
          vehicleId: vehicle.vehicleId,
        });
      }
    }
  }

  return { events };
}

// ── Main Detector ──

/**
 * Run all anomaly checks and log any detected anomalies.
 * Returns the newly detected anomalies (ones not already logged).
 */
export function runAnomalyDetection(tenantId: string): AnomalyCheckResult {
  const anomalyStore = useAnomalyStore.getState();
  const alertStore = useAlertStore.getState();

  if (!anomalyStore.config.enabled) {
    return { events: [] };
  }

  const config = anomalyStore.config;
  const allEvents: AnomalyCheckResult["events"] = [];

  // Run all three checks
  const deviation = checkRouteDeviation(tenantId, config);
  const prolongedStop = checkProlongedStop(tenantId, config);
  const noShow = checkNoShow(tenantId, config);

  allEvents.push(...deviation.events, ...prolongedStop.events, ...noShow.events);

  // Deduplicate against already-logged unresolved events
  const existingActive = anomalyStore.getActiveEvents();
  const existingKeys = new Set(
    existingActive.map((e) => `${e.type}-${e.vehicleId || ""}`)
  );

  const newEvents = allEvents.filter((e) => {
    const key = `${e.type}-${e.vehicleId || ""}`;
    return !existingKeys.has(key);
  });

  // Log new anomalies
  for (const event of newEvents) {
    anomalyStore.addEvent({
      tripId: "",
      vehicleIndex: 0,
      vehicleId: event.vehicleId,
      type: event.type,
      severity: event.severity,
      message: event.message,
    });

    // Also create an ops alert for visibility
    alertStore.addAlert({
      tenantId,
      type: event.type === "ROUTE_DEVIATION" ? "TRIP_ISSUE" :
             event.type === "PROLONGED_STOP" ? "DRIVER_OFFLINE" : "VEHICLE_BREAKDOWN",
      severity: event.severity === "CRITICAL" ? "critical" :
               event.severity === "HIGH" ? "HIGH" : "MEDIUM",
      message: `[${event.type}] ${event.message}`,
      tripId: "",
      vendorId: "",
      read: false,
    });
  }

  return {
    events: newEvents,
  };
}

/**
 * Start periodic anomaly detection. Returns a cleanup function.
 * Call this from a useEffect in the tracking page or dispatch page.
 */
export function startAnomalyDetectionLoop(
  tenantId: string | null
): () => void {
  if (!tenantId) return () => {};

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const runCheck = () => {
    if (!tenantId) return;
    try {
      const result = runAnomalyDetection(tenantId);
      if (result.events.length > 0) {
        console.log(`[AnomalyDetector] ${result.events.length} new anomaly(ies) detected:`, result.events.map((e) => e.type));
      }
    } catch (err) {
      console.error("[AnomalyDetector] Error during detection:", err);
    }
  };

  // Run immediately then on interval
  runCheck();
  intervalId = setInterval(runCheck, useAnomalyStore.getState().config.checkIntervalMs);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
