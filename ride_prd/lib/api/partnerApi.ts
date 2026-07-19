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

// FR-AP-5: Rate limiting
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  current: number;        // Current count in window
  windowStart: number;    // When the current window started
}

// FR-AP-6: Sandbox environment
interface SandboxConfig {
  enabled: boolean;
  tenantId: string;
  quota: number;           // Max API calls in sandbox
  quotaUsed: number;
  expiresAt: string;
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

// FR-AP-5: Idempotency store
export interface IdempotencyRecord {
  key: string;
  result: ApiResponse<unknown>;
  expiresAt: number;
}

const idempotencyCache: Map<string, IdempotencyRecord> = new Map();
const rateLimits: Map<string, RateLimitConfig> = new Map();

const SANDBOX_CONFIG: SandboxConfig = {
  enabled: true,
  tenantId: "SANDBOX_T1",
  quota: 100,
  quotaUsed: 0,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

function checkRateLimit(partnerId: string): boolean {
  const now = Date.now();
  let limit = rateLimits.get(partnerId);

  if (!limit || now - limit.windowStart > limit.windowMs) {
    limit = { windowMs: 60000, maxRequests: 100, current: 0, windowStart: now };
    rateLimits.set(partnerId, limit);
  }

  limit.current++;
  return limit.current <= limit.maxRequests;
}

function checkIdempotency(key: string): ApiResponse<unknown> | null {
  const record = idempotencyCache.get(key);
  if (record && record.expiresAt > Date.now()) {
    return record.result;
  }
  return null;
}

function cacheIdempotency(key: string, result: ApiResponse<unknown>): void {
  idempotencyCache.set(key, {
    key,
    result,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h TTL
  });
  // Prune expired entries
  if (idempotencyCache.size > 10000) {
    const now = Date.now();
    for (const [k, v] of idempotencyCache) {
      if (v.expiresAt < now) idempotencyCache.delete(k);
    }
  }
}

// Partner API class
export class PartnerAPIServer {
  private webhookStore = useWebhookStore;
  private tripStore = useTripStore;
  private customerStore = useCustomerStore;
  private vehicleTypeStore = useVehicleTypeStore;
  private sandboxEnabled: boolean = false;

  // FR-AP-6: Sandbox toggle
  setSandboxMode(enabled: boolean) {
    this.sandboxEnabled = enabled;
  }

  isSandboxMode(): boolean {
    return this.sandboxEnabled;
  }

  getSandboxConfig(): SandboxConfig {
    if (this.sandboxEnabled) {
      SANDBOX_CONFIG.quotaUsed++;
    }
    return { ...SANDBOX_CONFIG, quotaUsed: this.sandboxEnabled ? SANDBOX_CONFIG.quotaUsed : 0 };
  }

  // Authenticate partner
  authenticate(credentials: PartnerCredentials): { success: boolean; tenantId?: string; error?: ApiError } {
    // Sandbox mode: allow any key with sk_sandbox prefix
    if (this.sandboxEnabled && credentials.apiKey.startsWith("sk_sandbox_")) {
      SANDBOX_CONFIG.quotaUsed++;
      if (SANDBOX_CONFIG.quotaUsed > SANDBOX_CONFIG.quota) {
        return {
          success: false,
          error: { name: "SANDBOX_QUOTA_EXCEEDED", message: `Sandbox quota (${SANDBOX_CONFIG.quota} calls) exceeded`, code: "E_SANDBOX_QUOTA", status: 429 },
        };
      }
      return { success: true, tenantId: SANDBOX_CONFIG.tenantId };
    }

    // FR-AP-5: Check rate limit on auth
    if (!checkRateLimit(credentials.partnerId)) {
      return {
        success: false,
        error: { name: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded. Max 100 requests per minute", code: "E_RATE_LIMIT", status: 429 },
      };
    }

    const endpoint = this.webhookStore.getState().endpoints.find((e) => e.apiKey === credentials.apiKey && e.active);
    if (!endpoint) {
      return {
        success: false,
        error: { name: "AUTH_FAILED", message: "Invalid or inactive API key", code: "E_AUTH_FAILED", status: 401 },
      };
    }

    return { success: true, tenantId: endpoint.tenantId };
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

      // FR-AP-5: Idempotency check for this request type
      if (request.reference) {
        const idempKey = `pax-create-${request.reference}`;
        const cached = checkIdempotency(idempKey);
        if (cached) return cached as ApiResponse<{ tripId: string }>;
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

      // Cache for idempotency
      if (request.reference) {
        cacheIdempotency(`pax-create-${request.reference}`, { result: { tripId } });
      }

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

      // FR-AP-5: Idempotency check
      if (request.reference) {
        const idempKey = `vc-create-${request.reference}`;
        const cached = checkIdempotency(idempKey);
        if (cached) return cached as ApiResponse<{ tripId: string }>;
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

      // Cache for idempotency
      if (request.reference) {
        cacheIdempotency(`vc-create-${request.reference}`, { result: { tripId } });
      }

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

  // FR-AP-7: Customer read API (no login) by reference
  getCustomerByCode(tenantId: string, code: string): ApiResponse<{ id: string; name: string; code: string; billingCycle?: string; defaultCostCenter?: string }> {
    try {
      const customers = this.customerStore.getState().customers || [];
      const customer = customers.find((c) => c.code === code && c.tenantId === tenantId);

      if (!customer) {
        return {
          error: {
            name: "CUSTOMER_NOT_FOUND",
            message: `Customer with code "${code}" not found`,
            code: "E_CUSTOMER_NOT_FOUND",
            status: 404,
          },
        };
      }

      // Only expose non-PII fields — no SPOC name/phone/email
      return {
        result: {
          id: customer.id,
          name: customer.name,
          code: customer.code,
          billingCycle: customer.billingCycle,
          defaultCostCenter: customer.defaultCostCenter,
        },
      };
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
