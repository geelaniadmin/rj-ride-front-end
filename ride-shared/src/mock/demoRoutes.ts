/**
 * Demo simulation routes for each vehicle.
 * Each route is a series of waypoints that the vehicle follows sequentially.
 * Coordinates are real Bangalore locations.
 */

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name: string;
}

export interface VehicleRoute {
  vehicleId: string;       // e.g. "VH1"
  traccarDeviceId: string; // e.g. "TRA-001"
  waypoints: RouteWaypoint[];
  color: string;
}

export const DEMO_ROUTES: VehicleRoute[] = [
  {
    vehicleId: 'VH1',
    traccarDeviceId: 'TRA-001',
    color: '#10B981',
    waypoints: [
      { lat: 12.9767, lng: 77.5713, name: 'Majestic Bus Stand' },
      { lat: 12.9756, lng: 77.5862, name: 'Vidhana Soudha' },
      { lat: 12.9735, lng: 77.6067, name: 'MG Road Metro' },
      { lat: 12.9566, lng: 77.6304, name: 'Domlur' },
      { lat: 12.9352, lng: 77.6245, name: 'Koramangala' },
      { lat: 12.9196, lng: 77.6230, name: 'Jakkasandra' },
      { lat: 12.9076, lng: 77.6337, name: 'HSR Layout' },
      { lat: 12.9071, lng: 77.6507, name: 'Silk Board Junction' },
      { lat: 12.8454, lng: 77.6603, name: 'Electronic City' },
      { lat: 12.8454, lng: 77.6603, name: 'Electronic City (halt)' }, // dwell
      { lat: 12.9071, lng: 77.6507, name: 'Silk Board Junction' },
      { lat: 12.9352, lng: 77.6245, name: 'Koramangala' },
      { lat: 12.9735, lng: 77.6067, name: 'MG Road Metro' },
      { lat: 12.9767, lng: 77.5713, name: 'Majestic Bus Stand' },
    ],
  },
  {
    vehicleId: 'VH2',
    traccarDeviceId: 'TRA-002',
    color: '#3B82F6',
    waypoints: [
      { lat: 13.0358, lng: 77.5970, name: 'Hebbal Flyover' },
      { lat: 13.0200, lng: 77.5800, name: 'Yeshwanthpur' },
      { lat: 12.9900, lng: 77.5500, name: 'Rajajinagar' },
      { lat: 12.9700, lng: 77.5400, name: 'Vijayanagar' },
      { lat: 12.9500, lng: 77.5100, name: 'Mysore Road' },
      { lat: 12.9250, lng: 77.5400, name: 'Kengeri' },
      { lat: 12.9500, lng: 77.5100, name: 'Mysore Road' },
      { lat: 12.9700, lng: 77.5400, name: 'Vijayanagar' },
      { lat: 12.9900, lng: 77.5500, name: 'Rajajinagar' },
      { lat: 13.0200, lng: 77.5800, name: 'Yeshwanthpur' },
      { lat: 13.0358, lng: 77.5970, name: 'Hebbal Flyover' },
    ],
  },
  {
    vehicleId: 'VH3',
    traccarDeviceId: 'TRA-003',
    color: '#F97316',
    waypoints: [
      { lat: 13.1989, lng: 77.7068, name: 'Kempegowda Airport' },
      { lat: 13.1500, lng: 77.6900, name: 'Yelahanka' },
      { lat: 13.1000, lng: 77.6600, name: 'Thanisandra' },
      { lat: 13.0600, lng: 77.6200, name: 'Manyata Tech Park' },
      { lat: 13.0358, lng: 77.5970, name: 'Hebbal' },
      { lat: 13.0600, lng: 77.6200, name: 'Manyata Tech Park' },
      { lat: 13.1000, lng: 77.6600, name: 'Thanisandra' },
      { lat: 13.1500, lng: 77.6900, name: 'Yelahanka' },
      { lat: 13.1989, lng: 77.7068, name: 'Kempegowda Airport' },
    ],
  },
  {
    vehicleId: 'VH5',
    traccarDeviceId: 'TRA-005',
    color: '#8B5CF6',
    waypoints: [
      { lat: 12.9698, lng: 77.7500, name: 'Whitefield' },
      { lat: 12.9591, lng: 77.7000, name: 'Hoodi Circle' },
      { lat: 12.9545, lng: 77.6600, name: 'Marathahalli Bridge' },
      { lat: 12.9340, lng: 77.6700, name: 'Bellandur' },
      { lat: 12.9120, lng: 77.6600, name: 'Sarjapur Road' },
      { lat: 12.9076, lng: 77.6337, name: 'HSR Layout' },
      { lat: 12.9120, lng: 77.6600, name: 'Sarjapur Road' },
      { lat: 12.9340, lng: 77.6700, name: 'Bellandur' },
      { lat: 12.9545, lng: 77.6600, name: 'Marathahalli Bridge' },
      { lat: 12.9591, lng: 77.7000, name: 'Hoodi Circle' },
      { lat: 12.9698, lng: 77.7500, name: 'Whitefield' },
    ],
  },
];

/**
 * Get a vehicle's route by its traccarDeviceId
 */
export function getRouteByDeviceId(traccarDeviceId: string): VehicleRoute | undefined {
  return DEMO_ROUTES.find((r) => r.traccarDeviceId === traccarDeviceId);
}

/**
 * Get a vehicle's route by its app vehicleId
 */
export function getRouteByVehicleId(vehicleId: string): VehicleRoute | undefined {
  return DEMO_ROUTES.find((r) => r.vehicleId === vehicleId);
}
