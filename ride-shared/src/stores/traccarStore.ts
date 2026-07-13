import { create } from 'zustand';
import { TraccarPosition, TraccarDevice, traccarService } from '../services/traccarService';

interface TraccarState {
  // Devices
  devices: Map<number, TraccarDevice>;
  setDevices: (devices: TraccarDevice[]) => void;
  addDevice: (device: TraccarDevice) => void;

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
  simulateMovement: (deviceId: number) => void;

  // Utils
  getDeviceDashboardUrl: (deviceId: number) => string;
}

export const useTraccarStore = create<TraccarState>((set, get) => ({
  // Devices
  devices: new Map(),
  setDevices: (devices) => set({ devices: new Map(devices.map((d) => [d.id, d])) }),
  addDevice: (device) => {
    const current = get().devices;
    current.set(device.id, device);
    set({ devices: new Map(current) });
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

  simulateMovement: (deviceId) => {
    traccarService.simulateMovement(deviceId);
    // Trigger a re-fetch to update the store
    get().fetchDevicePosition(deviceId);
  },

  // Utils
  getDeviceDashboardUrl: (deviceId) => traccarService.getDashboardUrl(deviceId),
}));
