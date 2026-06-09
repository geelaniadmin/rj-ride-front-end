import { useWebhookStore } from "@/stores/webhookStore";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { getOffers } from "@/lib/quote";
import { createTripVehicle } from "@/lib/tripHelpers";
import { TripStatus } from "@/lib/types";

// Partner API error envelope
export interface ApiError {
  name: string;
  message: string;
  code: string;
  status: number;
}

export interface ApiResponse<T> {
  result?: T;
  error?: ApiError;
}

// Partner authentication
export interface PartnerCredentials {
  partnerId: string;
  apiKey: string;
}

// Trip creation requests
export interface CreateTripFromPaxRequest {
  customerId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  scheduleDate: string;
  pax: Array<{
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    pnr?: string;
  }>;
  vehicleType: string;
  reference?: string;
}

export interface CreateTripFromVehicleCountRequest {
  customerId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  scheduleDate: string;
  vehicleCount: number;
  vehicleType: string;
  autoAssign?: boolean;
  reference?: string;
}

// Partner API class
export class PartnerAPIServer {
  private webhookStore = useWebhookStore;
  private tripStore = useTripStore;
  private customerStore = useCustomerStore;
  private vehicleTypeStore = useVehicleTypeStore;

  // Authenticate partner
  authenticate(credentials: PartnerCredentials): boolean {
    const endpoint = this.webhookStore.getState().endpoints.find((e) => e.apiKey === credentials.apiKey && e.active);
    return !!endpoint;
  }

  // Create trip from pax (API_PAX method)
  createTripFromPax(tenantId: string, request: CreateTripFromPaxRequest): ApiResponse<{ tripId: string }> {
    try {
      const customers = this.customerStore.getState().customers || [];
      const customer = customers.find((c) => c.id === request.customerId && c.tenantId === tenantId);

      if (!customer) {
        return {
          error: {
            name: "CUSTOMER_NOT_FOUND",
            message: `Customer ${request.customerId} not found`,
            code: "E_CUSTOMER_NOT_FOUND",
            status: 404,
          },
        };
      }

      const vts = this.vehicleTypeStore.getState().vehicleTypes || [];
      const vt = vts.find((v) => v.name.toLowerCase() === request.vehicleType.toLowerCase() && v.tenantId === tenantId);

      if (!vt) {
        return {
          error: {
            name: "VEHICLE_TYPE_NOT_FOUND",
            message: `Vehicle type ${request.vehicleType} not found`,
            code: "E_VEHICLE_TYPE_NOT_FOUND",
            status: 404,
          },
        };
      }

      // Auto-group pax into vehicles
      const paxPerVehicle = 4;
      const vehicleCount = Math.ceil(request.pax.length / paxPerVehicle);

      const vehicles = [];
      for (let i = 0; i < vehicleCount; i++) {
        const startIdx = i * paxPerVehicle;
        const endIdx = Math.min(startIdx + paxPerVehicle, request.pax.length);
        const vehiclePax = request.pax.slice(startIdx, endIdx);

        const vehicle = createTripVehicle(vt.id);
        const offers = getOffers({
          tenantId,
          vendorId: "V1",
          customerId: request.customerId,
          vehicleTypeId: vt.id,
          quotedAt: request.scheduleDate,
          currency: "INR",
          distance: 10,
        });

        vehicles.push({
          ...vehicle,
          pax: vehiclePax,
          priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
          lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
          lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
        });
      }

      const tripId = this.tripStore.getState().addTrip({
        tenantId,
        customerId: request.customerId,
        createdVia: "API_PAX",
        stops: [
          {
            seq: 0,
            type: "PICKUP",
            locationType: "ADDRESS",
            address: request.pickupAddress,
            lat: request.pickupLat,
            lng: request.pickupLng,
          },
          {
            seq: 1,
            type: "DROP",
            locationType: "ADDRESS",
            address: request.dropAddress,
            lat: request.dropLat,
            lng: request.dropLng,
          },
        ],
        vehicles,
        schedule: { type: "ONE_OFF", when: `${request.scheduleDate}T08:00:00Z` },
        status: "DRAFT" as TripStatus,
        autoAssign: false,
        reference: request.reference,
      });

      // Trigger webhook
      this.triggerWebhook("TRIP_CREATED", { tripId, createdVia: "API_PAX", paxCount: request.pax.length }, tenantId);

      return { result: { tripId } };
    } catch (err) {
      return {
        error: {
          name: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          code: "E_INTERNAL",
          status: 500,
        },
      };
    }
  }

  // Create trip from vehicle count (API_VEHICLE_COUNT method)
  createTripFromVehicleCount(tenantId: string, request: CreateTripFromVehicleCountRequest): ApiResponse<{ tripId: string }> {
    try {
      const customers = this.customerStore.getState().customers || [];
      const customer = customers.find((c) => c.id === request.customerId && c.tenantId === tenantId);

      if (!customer) {
        return {
          error: {
            name: "CUSTOMER_NOT_FOUND",
            message: `Customer ${request.customerId} not found`,
            code: "E_CUSTOMER_NOT_FOUND",
            status: 404,
          },
        };
      }

      const vts = this.vehicleTypeStore.getState().vehicleTypes || [];
      const vt = vts.find((v) => v.name.toLowerCase() === request.vehicleType.toLowerCase() && v.tenantId === tenantId);

      if (!vt) {
        return {
          error: {
            name: "VEHICLE_TYPE_NOT_FOUND",
            message: `Vehicle type ${request.vehicleType} not found`,
            code: "E_VEHICLE_TYPE_NOT_FOUND",
            status: 404,
          },
        };
      }

      // Create empty vehicle slots
      const vehicles = [];
      for (let i = 0; i < request.vehicleCount; i++) {
        const vehicle = createTripVehicle(vt.id);
        const offers = getOffers({
          tenantId,
          vendorId: "V1",
          customerId: request.customerId,
          vehicleTypeId: vt.id,
          quotedAt: request.scheduleDate,
          currency: "INR",
          distance: 10,
        });

        vehicles.push({
          ...vehicle,
          priceId: offers.length > 0 ? offers[0]!.priceId : undefined,
          lockedPrice: offers.length > 0 ? offers[0]!.price : undefined,
          lockedRateCardVersion: offers.length > 0 ? offers[0]!.rateCardVersion : undefined,
        });
      }

      const tripId = this.tripStore.getState().addTrip({
        tenantId,
        customerId: request.customerId,
        createdVia: "API_VEHICLE_COUNT",
        stops: [
          {
            seq: 0,
            type: "PICKUP",
            locationType: "ADDRESS",
            address: request.pickupAddress,
            lat: request.pickupLat,
            lng: request.pickupLng,
          },
          {
            seq: 1,
            type: "DROP",
            locationType: "ADDRESS",
            address: request.dropAddress,
            lat: request.dropLat,
            lng: request.dropLng,
          },
        ],
        vehicles,
        schedule: { type: "ONE_OFF", when: `${request.scheduleDate}T08:00:00Z` },
        status: "DRAFT" as TripStatus,
        autoAssign: request.autoAssign ?? false,
        reference: request.reference,
      });

      // Trigger webhook
      this.triggerWebhook("TRIP_CREATED", { tripId, createdVia: "API_VEHICLE_COUNT", vehicleCount: request.vehicleCount }, tenantId);

      return { result: { tripId } };
    } catch (err) {
      return {
        error: {
          name: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          code: "E_INTERNAL",
          status: 500,
        },
      };
    }
  }

  // Trigger webhook (mock delivery)
  private triggerWebhook(event: string, payload: unknown, tenantId: string) {
    const endpoints = this.webhookStore.getState().getEndpointsByTenant(tenantId);
    endpoints.forEach((endpoint) => {
      if (endpoint.active && endpoint.events.includes(event)) {
        // Simulate webhook delivery
        const log = this.webhookStore.getState().addLog({
          webhookId: endpoint.id,
          event,
          payload,
          status: "pending",
          attempt: 1,
        });

        // Mock successful delivery after delay
        setTimeout(() => {
          this.webhookStore.getState().updateLog(log.id, {
            status: "success",
            statusCode: 200,
          });
        }, 1000);
      }
    });
  }
}

export const partnerApi = new PartnerAPIServer();
