import { create } from 'zustand';
import { TraccarPosition, TraccarDevice, traccarService } from '../services/traccarService';
import { DEMO_ROUTES } from '../mock/demoRoutes';

// Module-level interval reference for demo simulation cleanup
let demoSimInterval: ReturnType<typeof setInterval> | null = null;

interface TraccarState {
  // Devices
  devices: Map<number, TraccarDevice>;
  setDevices: (devices: TraccarDevice[]) => void;
  addDevice: (device: TraccarDevice) => void;

  // Devices indexed by uniqueId (matches vehicle traccarDeviceId)
  devicesByUniqueId: Map<string, TraccarDevice>;

  // Positions
  positions: Map<number, TraccarPosition>;
  setPosition: (deviceId: number, position: TraccarPosition) => void;
  setPositions: (positions: Map<number, TraccarPosition>) => void;

  // Updates
  lastUpdate: number;
  updateLastUpdate: () => void;

  // Settings
  traccarUrl: string;
  traccarUsername: string;
  traccarPassword: string;
  useMockData: boolean;

  setTraccarConfig: (url: string, username: string, password: string, useMock: boolean) => void;

  // Actions
  fetchDevicePosition: (deviceId: number) => Promise<void>;
  fetchAllPositions: (deviceIds: number[]) => Promise<void>;
  fetchDevices: () => Promise<void>;
  simulateMovement: (deviceId: number) => void;

  // Demo simulation
  demoSimulationActive: boolean;
  startDemoSimulation: () => void;
  stopDemoSimulation: () => void;

  // Lookup helpers
  getPositionForTraccarDeviceId: (traccarDeviceId: string) => TraccarPosition | undefined;
  getDeviceIdByUniqueId: (uniqueId: string) => number | undefined;

  // Utils
  getDeviceDashboardUrl: (deviceId: number) => string;
}

export const useTraccarStore = create<TraccarState>((set, get) => ({
  // Devices
  devices: new Map(),
  devicesByUniqueId: new Map(),
  setDevices: (devices) => {
    const byId = new Map<number, TraccarDevice>();
    const byUniqueId = new Map<string, TraccarDevice>();
    devices.forEach((d) => {
      byId.set(d.id, d);
      byUniqueId.set(d.uniqueId, d);
    });
    set({ devices: byId, devicesByUniqueId: byUniqueId });
  },
  addDevice: (device) => {
    const current = get().devices;
    const currentByUniqueId = get().devicesByUniqueId;
    current.set(device.id, device);
    currentByUniqueId.set(device.uniqueId, device);
    set({ devices: new Map(current), devicesByUniqueId: new Map(currentByUniqueId) });
  },

  // Positions
  positions: new Map(),
  setPosition: (deviceId, position) => {
    const current = get().positions;
    current.set(deviceId, position);
    set({ positions: new Map(current) });
  },
  setPositions: (positions) => set({ positions: new Map(positions) }),

  // Updates
  lastUpdate: Date.now(),
  updateLastUpdate: () => set({ lastUpdate: Date.now() }),

  // Settings
  traccarUrl: 'http://localhost:8082',
  traccarUsername: '',
  traccarPassword: '',
  useMockData: true,

  setTraccarConfig: (url, username, password, useMock) => {
    // Sync to the service singleton so API calls use the right mode/credentials
    traccarService.updateConfig({
      apiUrl: url,
      username,
      password,
      useMock,
    });

    set({
      traccarUrl: url,
      traccarUsername: username,
      traccarPassword: password,
      useMockData: useMock,
    });
  },

  // Actions
  fetchDevicePosition: async (deviceId) => {
    try {
      const position = await traccarService.getDevicePosition(deviceId);
      if (position) {
        get().setPosition(deviceId, position);
        get().updateLastUpdate();
      }
    } catch (error) {
      console.error(`Failed to fetch position for device ${deviceId}:`, error);
    }
  },

  fetchAllPositions: async (deviceIds) => {
    try {
      const positions = await traccarService.getDevicesPositions(deviceIds);
      get().setPositions(positions);
      get().updateLastUpdate();
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  },

  fetchDevices: async () => {
    try {
      const devices = await traccarService.fetchDevices();
      get().setDevices(devices);

      // Also fetch positions for all devices
      const deviceIds = devices.map((d) => d.id);
      get().fetchAllPositions(deviceIds);
    } catch (error) {
      console.error('Failed to fetch Traccar devices:', error);
    }
  },

  simulateMovement: (deviceId) => {
    traccarService.simulateMovement(deviceId);
    get().fetchDevicePosition(deviceId);
  },

  // Demo simulation
  demoSimulationActive: false,

  startDemoSimulation: () => {
    const state = get();
    if (state.demoSimulationActive) return; // Already running

    set({ demoSimulationActive: true });

    // Track current waypoint index for each route
    const routeProgress = new Map<string, number>();
    DEMO_ROUTES.forEach((route) => {
      routeProgress.set(route.traccarDeviceId, 0);
    });

    // Advance each vehicle to its next waypoint
    const advanceVehicles = () => {
      const s = get();
      if (!s.demoSimulationActive) return;

      DEMO_ROUTES.forEach((route) => {
        const idx = routeProgress.get(route.traccarDeviceId) ?? 0;
        const waypoint = route.waypoints[idx];
        const nextIdx = (idx + 1) % route.waypoints.length;
        const nextWaypoint = route.waypoints[nextIdx];
        if (!waypoint || !nextWaypoint) return;

        routeProgress.set(route.traccarDeviceId, nextIdx);

        // Calculate speed based on distance between waypoints
        const dlat = nextWaypoint.lat - waypoint.lat;
        const dlng = nextWaypoint.lng - waypoint.lng;
        const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111; // rough km
        const speed = Math.max(15, Math.round(distKm / 0.00055 * 3.6)); // simulate ~2 sec step

        // Find the device ID for this route
        const device = s.devicesByUniqueId.get(route.traccarDeviceId);
        const numericId = device?.id ?? parseInt(route.traccarDeviceId.replace('TRA-', ''));

        // Update the mock position in the service
        const bearing = Math.atan2(dlng, dlat) * (180 / Math.PI);
        traccarService.updateMockPosition(numericId, nextWaypoint.lat, nextWaypoint.lng, speed);
        traccarService.updateMockBearing(numericId, (bearing + 360) % 360);

        // Update the store position so the map re-renders
        s.fetchDevicePosition(numericId);
      });

      s.updateLastUpdate();
    };

    // Advance immediately to show movement, then every 2.5 seconds
    advanceVehicles();
    const interval = setInterval(advanceVehicles, 2500);

    // Store interval ref for cleanup
    demoSimInterval = interval;
  },

  stopDemoSimulation: () => {
    if (demoSimInterval !== null) {
      clearInterval(demoSimInterval);
      demoSimInterval = null;
    }
    set({ demoSimulationActive: false });
  },

  // Lookup helpers
  getPositionForTraccarDeviceId: (traccarDeviceId) => {
    const state = get();
    const device = state.devicesByUniqueId.get(traccarDeviceId);
    if (!device) return undefined;
    return state.positions.get(device.id);
  },

  getDeviceIdByUniqueId: (uniqueId) => {
    const device = get().devicesByUniqueId.get(uniqueId);
    return device?.id;
  },

  // Utils
  getDeviceDashboardUrl: (deviceId) => traccarService.getDashboardUrl(deviceId),
}));
