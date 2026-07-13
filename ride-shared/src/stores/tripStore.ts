import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TripRequest, TripVehicle, ID, TripStatus, VehicleStatus, VendorDeclineEntry, EventLogEntry, AuditLogEntry } from '../types';
import { encryptedStorage } from '../encryptedStorage';

function generateId(): string {
  return crypto.randomUUID();
}

interface TripStore {
  trips: TripRequest[];
  eventLog: EventLogEntry[];
  auditLog: AuditLogEntry[];

  // ride_prd existing methods (preserved for admin_portal compatibility)
  addTrip: (trip: Omit<TripRequest, 'id' | 'createdAt'>) => string;
  updateTrip: (id: ID, updates: Partial<TripRequest>) => void;
  getTripsByTenant: (tenantId: ID) => TripRequest[];
  getTripById: (tripId: ID) => TripRequest | undefined;
  updateVehiclePrice: (tripId: ID, vehicleId: ID, priceId: ID, lockedPrice: number, lockedRateCardVersion: number) => void;
  getDerivedTripStatus: (tripId: ID) => TripStatus;
  advanceVehicleStatus: (tripId: ID, vehicleIndex: number, nextStatus: VehicleStatus) => { success: boolean; message: string };
  cancelVehicle: (tripId: ID, vehicleIndex: number) => { success: boolean; message: string; penalty?: number };
  updateVehicleStatus: (tripId: ID, vehicleIndex: number, updates: Partial<TripVehicle>) => void;

  // Vendor-specific methods (new)
  acceptTrip: (tripId: string, vendorId: string, driverId: string, vehicleId: string) => { success: boolean; message: string };
  declineTrip: (tripId: string, vendorId: string, reason: string) => { success: boolean; message: string; failoverTo?: string };

  // Event/audit logging
  pushEvent: (event: Omit<EventLogEntry, 'id'>) => void;
  pushAudit: (entry: Omit<AuditLogEntry, 'id'>) => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: [],
      eventLog: [],
      auditLog: [],

      // === ride_prd existing methods ===

      addTrip: (trip) => {
        const tripId = generateId();
        const newTrip: TripRequest = { ...trip, id: tripId, createdAt: new Date().toISOString() };
        set((state) => ({ trips: [...state.trips, newTrip] }));
        return tripId;
      },

      updateTrip: (id, updates) => {
        set((state) => ({ trips: state.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
      },

      getTripsByTenant: (tenantId) => get().trips.filter((t) => t.tenantId === tenantId),

      getTripById: (tripId) => get().trips.find((t) => t.id === tripId),

      updateVehiclePrice: (tripId, vehicleId, priceId, lockedPrice, lockedRateCardVersion) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v) =>
                v.id === vehicleId ? { ...v, priceId, lockedPrice, lockedRateCardVersion } : v
              ),
            };
          }),
        }));
      },

      getDerivedTripStatus: (tripId) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return 'DRAFT' as TripStatus;
        const statuses = trip.vehicles.map((v) => v.status);
        if (statuses.length === 0) return 'DRAFT' as TripStatus;
        if (statuses.every((s) => s === 'COMPLETED' || s === 'NO_SHOW')) return 'COMPLETED' as TripStatus;
        if (statuses.every((s) => s === 'CANCELLED')) return 'CANCELLED' as TripStatus;
        if (statuses.some((s) => ['EN_ROUTE_PICKUP', 'AT_PICKUP', 'PAX_PICKED', 'IN_TRANSIT', 'AT_DROP'].includes(s))) return 'IN_PROGRESS' as TripStatus;
        if (statuses.some((s) => ['ASSIGNED', 'DRIVER_ACCEPTED'].includes(s))) return 'ASSIGNED' as TripStatus;
        return 'CONFIRMED' as TripStatus;
      },

      advanceVehicleStatus: (tripId, vehicleIndex, nextStatus) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return { success: false, message: 'Trip not found' };
        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) return { success: false, message: 'Vehicle not found' };

        // Basic transition validation
        const allowedTransitions: Record<string, string[]> = {
          PENDING: ['ASSIGNED', 'CANCELLED'],
          ASSIGNED: ['DRIVER_ACCEPTED', 'DRIVER_REJECTED', 'CANCELLED'],
          DRIVER_ACCEPTED: ['EN_ROUTE_PICKUP', 'CANCELLED'],
          EN_ROUTE_PICKUP: ['AT_PICKUP', 'DELAYED', 'BREAKDOWN', 'SOS', 'CANCELLED'],
          AT_PICKUP: ['PAX_PICKED', 'NO_SHOW', 'BREAKDOWN', 'SOS', 'CANCELLED'],
          PAX_PICKED: ['IN_TRANSIT', 'DELAYED', 'BREAKDOWN', 'SOS', 'CANCELLED'],
          IN_TRANSIT: ['AT_DROP', 'DELAYED', 'BREAKDOWN', 'ACCIDENT', 'SOS', 'CANCELLED'],
          AT_DROP: ['PAX_DROPPED', 'BREAKDOWN', 'SOS', 'CANCELLED'],
          PAX_DROPPED: ['COMPLETED'],
          COMPLETED: [],
          CANCELLED: [],
        };

        const allowed = allowedTransitions[vehicle.status] || [];
        if (!allowed.includes(nextStatus)) {
          return { success: false, message: `Cannot transition from ${vehicle.status} to ${nextStatus}` };
        }

        // OTP gates
        if (nextStatus === 'PAX_PICKED' && !vehicle.otp?.pickupVerified) {
          return { success: false, message: 'Pickup OTP must be verified' };
        }
        if (nextStatus === 'PAX_DROPPED' && !vehicle.otp?.dropVerified) {
          return { success: false, message: 'Drop OTP must be verified' };
        }

        // Update the vehicle status
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            const vehicles = t.vehicles.map((v, i) => (i === vehicleIndex ? { ...v, status: nextStatus } : v));
            return { ...t, vehicles };
          }),
        }));

        // Auto-create billing when all vehicles completed
        const updatedTrip = get().trips.find((t) => t.id === tripId);
        if (updatedTrip) {
          const allCompleted = updatedTrip.vehicles.every((v) => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(v.status));
          if (allCompleted && updatedTrip.status !== 'BILLED') {
            const subtotal = updatedTrip.vehicles.reduce((sum, v) => sum + (v.lockedPrice || 0), 0);
            const operatorFee = Math.round(subtotal * 0.15);
            get().pushEvent({
              type: 'TRIP_COMPLETED',
              tripId,
              vendorId: 'V1',
              timestamp: new Date().toISOString(),
            });
            set((state) => ({
              trips: state.trips.map((t) =>
                t.id === tripId ? { ...t, status: 'BILLED' as TripStatus } : t
              ),
            }));
          }
        }

        return { success: true, message: `Vehicle status set to ${nextStatus}` };
      },

      cancelVehicle: (tripId, vehicleIndex) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return { success: false, message: 'Trip not found' };
        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) return { success: false, message: 'Vehicle not found' };

        // Simplified penalty calculation (matching ride_prd's logic)
        let penalty = 0;
        if (vehicle.lockedPrice) {
          penalty = Math.round(vehicle.lockedPrice * 0.2); // 20% penalty
        }

        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            const vehicles = t.vehicles.map((v, i) =>
              i === vehicleIndex ? { ...v, status: 'CANCELLED' as VehicleStatus } : v
            );
            return { ...t, vehicles };
          }),
        }));

        return {
          success: true,
          message: `Vehicle cancelled${penalty > 0 ? ` with penalty ₹${penalty}` : ' (free cancellation)'}`,
          penalty,
        };
      },

      updateVehicleStatus: (tripId, vehicleIndex, updates) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            const vehicles = t.vehicles.map((v, i) => (i === vehicleIndex ? { ...v, ...updates } : v));
            return { ...t, vehicles };
          }),
        }));
      },

      // === Vendor-specific methods ===

      acceptTrip: (tripId, vendorId, driverId, vehicleId) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return { success: false, message: 'Trip not found' };

        const vehicleIndex = trip.vehicles.findIndex((v) => v.vehicleId === vehicleId || !v.driverId);
        if (vehicleIndex === -1) return { success: false, message: 'No vehicle slot found' };

        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            const vehicles = t.vehicles.map((v, i) =>
              i === vehicleIndex
                ? { ...v, status: 'ASSIGNED' as VehicleStatus, driverId, vehicleId }
                : v
            );
            return { ...t, vehicles, status: 'ASSIGNED' as TripStatus };
          }),
        }));

        get().pushEvent({ type: 'TRIP_ACCEPTED', tripId, vendorId, timestamp: new Date().toISOString() });
        get().pushAudit({ action: 'ACCEPT', tripId, vendorId, actor: vendorId, timestamp: new Date().toISOString() });

        return { success: true, message: `Trip accepted` };
      },

      declineTrip: (tripId, vendorId, reason) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return { success: false, message: 'Trip not found' };

        const declineEntry: VendorDeclineEntry = { vendorId, reason, declinedAt: new Date().toISOString() };

        // Mock failover: V1→V2, V2→V1
        const allVendors = ['V1', 'V2'];
        const existingDeclines = [...(trip.vendorDeclineLog || []), declineEntry].map(
          (e: VendorDeclineEntry) => e.vendorId
        );
        const nextVendor = allVendors.find((v) => !existingDeclines.includes(v));

        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vendorDeclineLog: [...(t.vendorDeclineLog || []), declineEntry],
              ...(nextVendor ? {} : { status: 'CONFIRMED' as TripStatus }),
            };
          }),
        }));

        get().pushEvent({ type: 'VENDOR_DECLINED', tripId, vendorId, timestamp: new Date().toISOString() });
        if (nextVendor) {
          get().pushEvent({ type: 'FAILOVER', tripId, vendorId: nextVendor, timestamp: new Date().toISOString() });
        }
        get().pushAudit({ action: 'REJECT', tripId, vendorId, reason, actor: vendorId, timestamp: new Date().toISOString() });

        return {
          success: true,
          message: nextVendor ? `Declined — assigned to ${nextVendor}` : 'Declined — no vendors available',
          failoverTo: nextVendor,
        };
      },

      pushEvent: (event) => {
        const entry: EventLogEntry = { ...event, id: generateId() };
        set((state) => ({ eventLog: [entry, ...state.eventLog].slice(0, 100) }));
      },

      pushAudit: (entry) => {
        const auditEntry: AuditLogEntry = { ...entry, id: generateId() };
        set((state) => ({ auditLog: [auditEntry, ...state.auditLog].slice(0, 200) }));
      },
    }),
    { name: 'ride-trips', storage: createJSONStorage(() => encryptedStorage()) }
  )
);
