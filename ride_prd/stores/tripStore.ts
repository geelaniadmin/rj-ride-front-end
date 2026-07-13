import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TripRequest, TripVehicle, Stop, ID, CreationMethod, TripStatus, Pax, VehicleStatus } from "@/lib/types";
import { id } from "@/lib/mock";
import { encryptedStorage } from "@ride/shared";
import { deriveTripStatus, isTransitionAllowed } from "@/lib/lifecycle";
import { checkCancel, checkUpdate } from "@/lib/preflight";
import { useQuoteStore } from "@/stores/quoteStore";
import { useBillingStore } from "@/stores/billingStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";

// Return type for vehicle swap
export interface SwapResult {
  success: boolean;
  message: string;
  replacementVehicleId?: string;
  replacementDriverId?: string;
  replacementVehiclePlate?: string;
  replacementDriverName?: string;
  replacementVendorId?: string;
}

interface TripStore {
  trips: TripRequest[];
  addTrip: (trip: Omit<TripRequest, "id" | "createdAt">) => string;
  updateTrip: (id: ID, updates: Partial<TripRequest>) => void;
  getTripsByTenant: (tenantId: ID) => TripRequest[];
  getTripById: (tripId: ID) => TripRequest | undefined;
  updateVehiclePrice: (tripId: ID, vehicleId: ID, priceId: ID, lockedPrice: number, lockedRateCardVersion: number) => void;
  getDerivedTripStatus: (tripId: ID) => TripStatus;
  advanceVehicleStatus: (tripId: ID, vehicleIndex: number, nextStatus: VehicleStatus) => { success: boolean; message: string };
  cancelVehicle: (tripId: ID, vehicleIndex: number) => { success: boolean; message: string; penalty?: number };
  verifyOtp: (tripId: ID, vehicleIndex: number, phase: "pickup" | "drop", otp: string) => { success: boolean; message: string; blocked?: boolean; remainingAttempts?: number };
  reportBreakdown: (tripId: ID, vehicleIndex: number, reason: string) => { success: boolean; message: string };
  performVehicleSwap: (tripId: ID, vehicleIndex: number, reason: string) => SwapResult;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: [],
      addTrip: (trip) => {
        const tripId = id();
        const newTrip: TripRequest = {
          ...trip,
          id: tripId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          trips: [...state.trips, newTrip],
        }));
        return tripId;
      },
      updateTrip: (tripId, updates) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.id === tripId ? { ...t, ...updates } : t)),
        }));
      },
      getTripsByTenant: (tenantId) => {
        return get().trips.filter((t) => t.tenantId === tenantId);
      },
      getTripById: (tripId) => {
        return get().trips.find((t) => t.id === tripId);
      },
      updateVehiclePrice: (tripId, vehicleId, priceId, lockedPrice, lockedRateCardVersion) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v) => {
                if (v.id !== vehicleId) return v;
                return {
                  ...v,
                  priceId,
                  lockedPrice,
                  lockedRateCardVersion,
                };
              }),
            };
          }),
        }));
      },
      getDerivedTripStatus: (tripId) => {
        const trip = get().getTripById(tripId);
        if (!trip) return "DRAFT";
        return deriveTripStatus(trip.vehicles.map((v) => v.status));
      },
      advanceVehicleStatus: (tripId, vehicleIndex, nextStatus) => {
        const trip = get().getTripById(tripId);
        if (!trip) {
          return { success: false, message: "Trip not found" };
        }

        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) {
          return { success: false, message: "Vehicle not found" };
        }

        const validation = isTransitionAllowed(vehicle.status, nextStatus);
        if (!validation.allowed) {
          return { success: false, message: validation.reason || "Transition not allowed" };
        }

        // Check if OTP is required and verified
        if (validation.requiredOtpVerified === "pickup" && !vehicle.otp?.pickupVerified) {
          return { success: false, message: "Pickup OTP must be verified before proceeding" };
        }

        if (validation.requiredOtpVerified === "drop" && !vehicle.otp?.dropVerified) {
          return { success: false, message: "Drop OTP must be verified before proceeding" };
        }

        const updatedVehicles = trip.vehicles.map((v, i) =>
          i === vehicleIndex ? { ...v, status: nextStatus } : v
        );

        get().updateTrip(tripId, { vehicles: updatedVehicles });

        // Auto-create billable trip when all vehicles completed
        const newTrip = get().getTripById(tripId);
        if (newTrip) {
          const allCompleted = newTrip.vehicles.every((v) => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(v.status));
          if (allCompleted && newTrip.status !== "BILLED") {
            const billingStore = useBillingStore.getState();
            const subtotal = newTrip.vehicles.reduce((sum, v) => sum + (v.lockedPrice || 0), 0);

            // Calculate operator fee based on config
            const config = billingStore.getOperatorFeeConfig(trip.tenantId);
            let operatorFee = 0;
            if (config.type === "FLAT") {
              operatorFee = config.amount || 0;
            } else if (config.type === "PERCENT") {
              operatorFee = (subtotal * (config.amount || 0)) / 100;
            } else if (config.type === "TIERED" && config.tiers) {
              const tier = config.tiers.find((t) => subtotal >= t.minAmount && (!t.maxAmount || subtotal < t.maxAmount));
              operatorFee = tier ? (subtotal * tier.feePercent) / 100 : 0;
            }

            // Create billing lines first
            const billingLines = newTrip.vehicles.map((v) =>
              billingStore.addBillingLine({
                tripId: trip.id,
                vehicleId: v.id,
                priceId: v.priceId || "",
                lockedPrice: v.lockedPrice || 0,
                lockedRateCardVersion: v.lockedRateCardVersion || 1,
                customerId: trip.customerId,
                currency: "INR",
                status: "UNBILLED",
              })
            );

            // Create billable trip with calculated operator fee and total
            billingStore.createBillableTrip({
              tenantId: trip.tenantId,
              tripId: trip.id,
              customerId: trip.customerId,
              lines: billingLines,
              subtotal,
              operatorFee,
              total: subtotal + operatorFee,
              currency: "INR",
              status: "UNBILLED",
            });

            // Mark trip as billed
            get().updateTrip(tripId, { status: "BILLED" });
          }
        }

        return { success: true, message: `Vehicle status updated to ${nextStatus}` };
      },
      cancelVehicle: (tripId, vehicleIndex) => {
        const trip = get().getTripById(tripId);
        if (!trip) {
          return { success: false, message: "Trip not found" };
        }

        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) {
          return { success: false, message: "Vehicle not found" };
        }

        const updateCheck = checkUpdate(trip);
        if (!updateCheck.allowed) {
          return { success: false, message: updateCheck.message };
        }

        // Get offer for this vehicle to compute penalty
        let penalty = 0;
        if (vehicle.priceId && vehicle.lockedPrice && trip.stops[0]) {
          const quoteStore = useQuoteStore.getState();
          const offer = quoteStore.offers.find((o) => o.priceId === vehicle.priceId);

          if (offer) {
            const pickupTime = trip.stops[0].plannedTime || new Date().toISOString();
            const cancelResult = checkCancel(offer, pickupTime, vehicle.lockedPrice);
            penalty = cancelResult.penaltyAmount || 0;
          }
        }

        const updatedVehicles = trip.vehicles.map((v, i) =>
          i === vehicleIndex ? { ...v, status: "CANCELLED" as VehicleStatus } : v
        );

        get().updateTrip(tripId, { vehicles: updatedVehicles });

        return {
          success: true,
          message: `Vehicle cancelled${penalty > 0 ? ` with penalty ₹${penalty.toFixed(0)}` : " (free cancellation)"}`,
          penalty,
        };
      },

      verifyOtp: (tripId, vehicleIndex, phase, otp) => {
        const trip = get().getTripById(tripId);
        if (!trip) return { success: false, message: "Trip not found" };

        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) return { success: false, message: "Vehicle not found" };

        const expectedOTP = vehicle.otp?.[phase] || "1234";
        const MAX_ATTEMPTS = 3;

        // Count existing failed attempts
        const failedAttempts = vehicle.otpFailedAttempts?.length || 0;
        const remainingAttempts = MAX_ATTEMPTS - failedAttempts;

        if (failedAttempts >= MAX_ATTEMPTS) {
          return {
            success: false,
            message: "OTP blocked — too many failed attempts. Dispatcher alerted.",
            blocked: true,
            remainingAttempts: 0,
          };
        }

        if (otp !== expectedOTP) {
          const attemptLog = { attemptedAt: new Date().toISOString(), enteredOtp: otp };
          const newFailedAttempts = [...(vehicle.otpFailedAttempts || []), attemptLog];
          const newRemaining = MAX_ATTEMPTS - newFailedAttempts.length;

          set((state) => ({
            trips: state.trips.map((t) => {
              if (t.id !== tripId) return t;
              return {
                ...t,
                vehicles: t.vehicles.map((v, i) =>
                  i === vehicleIndex ? { ...v, otpFailedAttempts: newFailedAttempts } : v
                ),
              };
            }),
          }));

          const msg =
            newRemaining <= 0
              ? "⚠️ Too many failed OTP attempts! Dispatcher has been notified."
              : `Incorrect OTP. ${newRemaining} attempt(s) remaining.`;

          return { success: false, message: msg, remainingAttempts: newRemaining };
        }

        // Correct OTP — mark verified
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v, i) =>
                i === vehicleIndex
                  ? {
                      ...v,
                      otp: {
                        ...v.otp,
                        [phase === "pickup" ? "pickupVerified" : "dropVerified"]: true,
                        [phase]: v.otp?.[phase] || expectedOTP,
                      },
                      otpFailedAttempts: [], // Reset attempts on success
                    }
                  : v
              ),
            };
          }),
        }));

        return { success: true, message: `${phase === "pickup" ? "Pickup" : "Drop"} OTP verified successfully` };
      },

      reportBreakdown: (tripId, vehicleIndex, reason) => {
        const trip = get().getTripById(tripId);
        if (!trip) return { success: false, message: "Trip not found" };

        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) return { success: false, message: "Vehicle not found" };

        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v, i) =>
                i === vehicleIndex
                  ? { ...v, status: "BREAKDOWN" as VehicleStatus, breakdownReason: reason }
                  : v
              ),
            };
          }),
        }));

        return { success: true, message: `Breakdown reported: ${reason}` };
      },

      performVehicleSwap: (tripId, vehicleIndex, reason) => {
        const trip = get().getTripById(tripId);
        if (!trip) return { success: false, message: "Trip not found" };

        const vehicle = trip.vehicles[vehicleIndex];
        if (!vehicle) return { success: false, message: "Vehicle not found" };

        const vehicleStore = useVehicleStore.getState();
        const driverStore = useDriverStore.getState();

        // 1. Find a replacement vehicle of the same type, not the current one, and active
        const currentVehicleMeta = vehicle.vehicleId
          ? vehicleStore.vehicles.find((v) => v.id === vehicle.vehicleId)
          : null;
        const requestedTypeId = vehicle.requestedVehicleTypeId;

        // Find available vehicles of the same type, excluding the current one
        const sameTypeVehicles = vehicleStore.vehicles.filter(
          (v) =>
            v.vehicleTypeId === requestedTypeId &&
            v.active &&
            v.id !== vehicle.vehicleId &&
            v.tenantId === trip.tenantId
        );

        if (sameTypeVehicles.length === 0) {
          return {
            success: false,
            message: `No replacement vehicle available for type ${requestedTypeId}`,
          };
        }

        // Pick the first available replacement
        const replacementVehicle = sameTypeVehicles[0];
        if (!replacementVehicle) {
          return { success: false, message: "No replacement vehicle found" };
        }

        // 2. Find an available driver
        const availableDrivers = driverStore.drivers.filter(
          (d) =>
            d.tenantId === trip.tenantId &&
            d.available &&
            d.active &&
            d.id !== vehicle.driverId
        );

        const replacementDriver = availableDrivers.length > 0 ? availableDrivers[0] : null;

        // 3. Perform the swap — preserve TripVehicle.id, priceId, lockedPrice, OTP
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v, i) =>
                i === vehicleIndex
                  ? {
                      ...v,
                      vehicleId: replacementVehicle.id,
                      driverId: replacementDriver?.id || v.driverId,
                      vendorId: replacementVehicle.ownerVendorId,
                      status: "VEHICLE_SWAP" as VehicleStatus,
                      breakdownReason: reason,
                      // Preserve price, OTP, id — unchanged
                    }
                  : v
              ),
            };
          }),
        }));

        return {
          success: true,
          message: `Vehicle swapped to ${replacementVehicle.make} ${replacementVehicle.model} (${replacementVehicle.registrationNo})`,
          replacementVehicleId: replacementVehicle.id,
          replacementDriverId: replacementDriver?.id,
          replacementVehiclePlate: replacementVehicle.registrationNo,
          replacementDriverName: replacementDriver?.name,
          replacementVendorId: replacementVehicle.ownerVendorId,
        };
      },
    }),
    {
      name: "ride-trips",
      storage: createJSONStorage(() => encryptedStorage()),
    }
  )
);
