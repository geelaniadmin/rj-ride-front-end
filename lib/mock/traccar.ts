import { Stop } from "@/lib/types";

export interface VehiclePosition {
  traccarDeviceId: string;
  lat: number;
  lng: number;
  timestamp: number;
  speed: number; // km/h
  heading: number; // 0-360 degrees
  status: string; // PENDING, ASSIGNED, EN_ROUTE_PICKUP, AT_PICKUP, PAX_PICKED, IN_TRANSIT, AT_DROP, PAX_DROPPED, etc.
}

// Mock speed: 40 km/h average
const MOCK_SPEED_KMH = 40;

// Calculate distance between two points (haversine formula) in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate heading between two points (bearing) in degrees
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Linear interpolation between two points
function interpolatePosition(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  progress: number
): { lat: number; lng: number } {
  return {
    lat: lat1 + (lat2 - lat1) * progress,
    lng: lng1 + (lng2 - lng1) * progress,
  };
}

// Get ETA in minutes to next stop based on remaining distance and current speed
export function getETA(currentLat: number, currentLng: number, nextStopLat: number, nextStopLng: number): number {
  const distanceKm = calculateDistance(currentLat, currentLng, nextStopLat, nextStopLng);
  // If already at stop (within 0.1 km), ETA is 0
  if (distanceKm < 0.1) return 0;
  const etaMinutes = (distanceKm / MOCK_SPEED_KMH) * 60;
  return Math.ceil(etaMinutes);
}

// Generate mock vehicle positions based on trip vehicle assignments
export class TraccarSimulator {
  private positions: Map<string, VehiclePosition> = new Map();
  private vehicleProgression: Map<string, { tripId: string; vehicleIndex: number; currentStopIdx: number; progressToNextStop: number }> =
    new Map();
  private locationSharingEnabled: Set<string> = new Set();

  constructor() {
    this.initializePositions();
  }

  // Initialize vehicle positions at their first stop (pickup)
  private initializePositions() {
    // This will be populated by setTripVehicles
  }

  // Set trip vehicles to track (called from tracking page)
  setTripVehicles(
    tripVehicles: Array<{
      tripId: string;
      vehicleIndex: number;
      vehicleId?: string;
      status: string;
      stops: Stop[];
    }>
  ) {
    tripVehicles.forEach(({ tripId, vehicleIndex, vehicleId, status, stops }) => {
      if (!vehicleId || stops.length === 0) return;

      const deviceId = `device-${vehicleId}`;
      const firstStop = stops[0];
      if (!firstStop) return;

      // Determine which stop the vehicle is at based on status
      let currentStopIdx = 0;
      let progressToNextStop = 0;

      if (status === "EN_ROUTE_PICKUP") {
        currentStopIdx = 0;
        progressToNextStop = 0.3; // 30% of the way to pickup
      } else if (status === "AT_PICKUP" || status === "PAX_PICKED") {
        currentStopIdx = 0;
        progressToNextStop = 0;
      } else if (status === "IN_TRANSIT") {
        currentStopIdx = 1;
        progressToNextStop = 0.5; // 50% of the way to next stop
      } else if (status === "AT_DROP") {
        currentStopIdx = Math.max(1, stops.length - 1);
        progressToNextStop = 0;
      } else {
        currentStopIdx = 0;
        progressToNextStop = 0;
      }

      this.vehicleProgression.set(deviceId, {
        tripId,
        vehicleIndex,
        currentStopIdx,
        progressToNextStop,
      });

      // Set initial position at first stop
      this.positions.set(deviceId, {
        traccarDeviceId: deviceId,
        lat: firstStop.lat,
        lng: firstStop.lng,
        timestamp: Date.now(),
        speed: status === "IN_TRANSIT" ? MOCK_SPEED_KMH : 0,
        heading: 0,
        status,
      });
    });
  }

  // Enable location sharing for a driver (updates their vehicle position)
  enableLocationSharing(vehicleId: string) {
    this.locationSharingEnabled.add(`device-${vehicleId}`);
  }

  // Disable location sharing for a driver
  disableLocationSharing(vehicleId: string) {
    this.locationSharingEnabled.delete(`device-${vehicleId}`);
  }

  // Update vehicle status (e.g., transitions from ASSIGNED to EN_ROUTE_PICKUP)
  updateVehicleStatus(vehicleId: string, newStatus: string, stops?: Stop[]) {
    const deviceId = `device-${vehicleId}`;
    const position = this.positions.get(deviceId);
    const progression = this.vehicleProgression.get(deviceId);

    if (!position || !progression || !stops) return;

    const stop = stops[progression.currentStopIdx];
    if (!stop) return;

    // Update status
    position.status = newStatus;

    // Adjust progression based on new status
    if (newStatus === "EN_ROUTE_PICKUP") {
      progression.progressToNextStop = 0.1;
      position.speed = MOCK_SPEED_KMH;
    } else if (newStatus === "AT_PICKUP" || newStatus === "PAX_PICKED") {
      progression.progressToNextStop = 0;
      position.speed = 0;
      position.lat = stop.lat;
      position.lng = stop.lng;
    } else if (newStatus === "IN_TRANSIT" && progression.currentStopIdx < stops.length - 1) {
      progression.progressToNextStop = 0.05;
      position.speed = MOCK_SPEED_KMH;
    } else if (newStatus === "AT_DROP") {
      progression.progressToNextStop = 0;
      position.speed = 0;
      const lastStop = stops[stops.length - 1];
      if (lastStop) {
        position.lat = lastStop.lat;
        position.lng = lastStop.lng;
      }
    } else if (newStatus === "COMPLETED") {
      position.speed = 0;
    }

    position.timestamp = Date.now();
  }

  // Update vehicle position (called by animation loop)
  // Vehicles animate based on status (EN_ROUTE_PICKUP, IN_TRANSIT), regardless of location sharing
  // Location sharing toggle controls visibility to operators, not animation
  updatePositions(stops: Map<string, Stop[]>) {
    this.positions.forEach((position, deviceId) => {
      // Only animate if vehicle is in motion status; location sharing is UI visibility only
      if (!["EN_ROUTE_PICKUP", "IN_TRANSIT"].includes(position.status)) return;

      const progression = this.vehicleProgression.get(deviceId);
      if (!progression) return;

      const tripStops = stops.get(progression.tripId);
      if (!tripStops || tripStops.length === 0) return;

      const currentStop = tripStops[progression.currentStopIdx];
      const nextStop = tripStops[progression.currentStopIdx + 1];

      if (!currentStop || !nextStop) {
        return; // At final stop
      }

      // Animate toward next stop
      if (position.speed > 0) {
        const distance = calculateDistance(currentStop.lat, currentStop.lng, nextStop.lat, nextStop.lng);
        const timePerUpdateMs = 1000; // Update every 1 second
        const timePerUpdateHours = timePerUpdateMs / (1000 * 60 * 60);
        const progressIncrement = (position.speed * timePerUpdateHours) / distance;

        progression.progressToNextStop += progressIncrement;

        if (progression.progressToNextStop >= 1) {
          // Reached next stop
          progression.currentStopIdx += 1;
          progression.progressToNextStop = 0;
          position.lat = nextStop.lat;
          position.lng = nextStop.lng;
          position.speed = 0;
        } else {
          // Interpolate position
          const newPos = interpolatePosition(
            currentStop.lat,
            currentStop.lng,
            nextStop.lat,
            nextStop.lng,
            progression.progressToNextStop
          );
          position.lat = newPos.lat;
          position.lng = newPos.lng;
          position.heading = calculateHeading(currentStop.lat, currentStop.lng, nextStop.lat, nextStop.lng);
        }

        position.timestamp = Date.now();
      }
    });
  }

  // Get all vehicle positions
  getAllPositions(): VehiclePosition[] {
    return Array.from(this.positions.values());
  }

  // Get position for a specific vehicle
  getPosition(vehicleId: string): VehiclePosition | undefined {
    return this.positions.get(`device-${vehicleId}`);
  }

  // Check if location sharing is enabled for a vehicle
  isLocationSharingEnabled(vehicleId: string): boolean {
    return this.locationSharingEnabled.has(`device-${vehicleId}`);
  }
}

// Global singleton instance
let traccarInstance: TraccarSimulator | null = null;

export function getTraccarSimulator(): TraccarSimulator {
  if (!traccarInstance) {
    traccarInstance = new TraccarSimulator();
  }
  return traccarInstance;
}
