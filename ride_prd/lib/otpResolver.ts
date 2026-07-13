import { TripVehicle, Customer, Tenant } from "@/lib/types";

export interface OTPResolution {
  enabled: boolean;
  code?: string;
  source: "trip_override" | "customer" | "tenant" | "default";
}

/**
 * Resolves OTP configuration using the priority chain:
 * 1. Per-trip override (TripVehicle.otp) — highest priority
 * 2. Customer-level config (Customer.otpConfig)
 * 3. Tenant-level config (Tenant.otpConfig)
 * 4. Default fallback (enabled: true)
 */
export function resolveOTP(
  vehicle: TripVehicle,
  customer?: Customer,
  tenant?: Tenant
): OTPResolution {
  // Priority 1: Per-trip override
  if (vehicle.otp?.pickup || vehicle.otp?.drop) {
    return {
      enabled: true,
      code: vehicle.otp?.pickup || vehicle.otp?.drop,
      source: "trip_override",
    };
  }

  // Priority 2: Customer-level config
  if (customer?.otpConfig) {
    return {
      enabled: customer.otpConfig.enabled,
      code: customer.otpConfig.defaultCode,
      source: "customer",
    };
  }

  // Priority 3: Tenant-level config
  if (tenant?.otpConfig) {
    return {
      enabled: tenant.otpConfig.enabled,
      code: tenant.otpConfig.defaultCode,
      source: "tenant",
    };
  }

  // Priority 4: Default (enabled)
  return {
    enabled: true,
    source: "default",
  };
}
