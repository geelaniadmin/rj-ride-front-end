export type ID = string;

// Enums and literal types
export type CreationMethod = "MANUAL" | "BULK_UPLOAD" | "API_PAX" | "API_VEHICLE_COUNT" | "RECURRING" | "CLONE";
export type TripStatus = "DRAFT" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "BILLED" | "CANCELLED";
export type VehicleStatus =
  | "PENDING"
  | "ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_REJECTED"
  | "EN_ROUTE_PICKUP"
  | "AT_PICKUP"
  | "PAX_PICKED"
  | "IN_TRANSIT"
  | "AT_DROP"
  | "PAX_DROPPED"
  | "COMPLETED"
  | "NO_SHOW"
  | "BREAKDOWN"
  | "ACCIDENT"
  | "VEHICLE_SWAP"
  | "DELAYED"
  | "SOS"
  | "CANCELLED";

export type StopType = "PICKUP" | "DROP" | "WAYPOINT";
export type LocationType = "AIRPORT" | "RAIL" | "HOTEL" | "CITY" | "ADDRESS";
export type RateBasis = "PER_KM" | "FIXED_LOCATION_PAIR" | "HOURLY" | "PACKAGE";

export type VehicleDocumentKind = "REGISTRATION" | "PERMIT_NATIONAL" | "PERMIT_STATE" | "FITNESS" | "PUC" | "INSURANCE";
export type DriverDocumentKind = "LICENCE" | "PSV_BADGE" | "POLICE_VERIFICATION" | "MEDICAL" | "INDUCTION";
export type DriverShift = "DAY" | "NIGHT" | "FLEX";
export type VehicleOwnership = "OWN" | "LEASED" | "SUB_VENDOR";
export type VehicleType = "SEDAN" | "SUV" | "TEMPO_TRAVELLER" | "COACH";
export type FuelType = "PETROL" | "DIESEL" | "CNG" | "EV";

export type AddonCategory = "MEET_GREET" | "CHILD_SEAT" | "TOLL_ROAD";
export type AddonType = "TABLE" | "SEAT" | "BOOSTER" | "TOLL";

export type BillingCycle = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
export type RecurrenceFreq = "DAILY" | "WEEKLY";
export type ScheduleType = "ONE_OFF" | "RECURRING";
export type TollHandling = "INCLUDED" | "EXTRA";
export type ParkingHandling = "INCLUDED" | "EXTRA";

// Configuration entities
export interface Tenant {
  id: ID;
  name: string;
  legalName: string;
  baseCity: string;
  contractCurrency: string;
}

export interface Vendor {
  id: ID;
  tenantId: ID;
  name: string;
  type: "SELF" | "SUB_VENDOR";
  gstin?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface Customer {
  id: ID;
  tenantId: ID;
  name: string;
  code: string;
  billingCycle?: BillingCycle;
  spocName?: string;
  phone?: string;
  email?: string;
  approvedVehicleTypeIds?: ID[];
  defaultCostCenter?: string;
  active: boolean;
}

export interface VehicleTypeConfig {
  id: ID;
  tenantId: ID;
  name: string;
  seatingCapacity: number;
  ac: boolean;
  class?: string;
  active: boolean;
}

export interface VehicleDocument {
  kind: VehicleDocumentKind;
  number?: string;
  expiry?: string;
  fileName?: string;
}

export interface Vehicle {
  id: ID;
  tenantId: ID;
  ownerVendorId: ID;
  ownership: VehicleOwnership;
  vehicleTypeId: ID;
  make: string;
  model: string;
  year?: number;
  registrationNo: string;
  seatingCapacity: number;
  ac: boolean;
  fuelType: FuelType;
  traccarDeviceId?: string;
  documents: VehicleDocument[];
  active: boolean;
}

export interface DriverDocument {
  kind: DriverDocumentKind;
  number?: string;
  expiry?: string;
  fileName?: string;
}

export interface Driver {
  id: ID;
  tenantId: ID;
  vendorId: ID;
  name: string;
  phone: string;
  licenceNo: string;
  licenceClass?: string;
  documents: DriverDocument[];
  languages?: string[];
  assignedVehicleIds?: ID[];
  shift?: DriverShift;
  rating?: number;
  available: boolean;
  active: boolean;
}

// Add-on services
export interface AddonService {
  id: ID;
  tenantId: ID;
  category: AddonCategory;
  type: AddonType;
  name: string;
  defaultInclude: boolean;
  price?: number;
}

// Rate engine and quotes
export interface RateModifiers {
  minFare?: number;
  nightCharge?: number;
  waitingPerHour?: number;
  tollHandling?: TollHandling;
  parkingHandling?: ParkingHandling;
  interStateSurcharge?: number;
  deadMileagePerKm?: number;
}

export interface FixedPair {
  fromZone: string;
  toZone: string;
  price: number;
}

export interface PackageRate {
  hours: number;
  km: number;
  price: number;
  extraPerHour?: number;
  extraPerKm?: number;
}

export interface RateCard {
  id: ID;
  tenantId: ID;
  vendorId: ID;
  customerId: ID;
  vehicleTypeId: ID;
  basis: RateBasis;
  perKm?: number;
  fixedPairs?: FixedPair[];
  hourlyRate?: number;
  package?: PackageRate;
  modifiers?: RateModifiers;
  validFrom: string;
  validTo?: string;
  version: number;
}

export interface Offer {
  priceId: ID;
  tenantId: ID;
  rateCardId: ID;
  rateCardVersion: number;
  customerId: ID;
  vehicleTypeId: ID;
  basis: RateBasis;
  price: number;
  currency: string;
  freeCancellationHours: number;
  minLeadTimeHours: number;
  blackoutDates?: string[];
  includedServices?: string[];
  quotedAt: string;
  expiresAt: string;
}

// Trips
export interface Stop {
  seq: number;
  type: StopType;
  locationType: LocationType;
  address: string;
  lat: number;
  lng: number;
  plannedTime?: string;
  flightNumber?: string;
  trainNumber?: string;
  terminal?: string;
}

export interface Pax {
  id: ID;
  name?: string;
  phone?: string;
  email?: string;
  employeeId?: string;
  pnr?: string;
}

export interface OTPGates {
  pickup?: string;
  drop?: string;
  pickupVerified?: boolean;
  dropVerified?: boolean;
}

export interface TripVehicle {
  id: ID;
  requestedVehicleTypeId: ID;
  vendorId?: ID;
  priceId?: ID;
  lockedPrice?: number;
  lockedRateCardVersion?: number;
  vehicleId?: ID;
  driverId?: ID;
  status: VehicleStatus;
  pax: Pax[];
  otp?: OTPGates;
  addonServiceIds?: ID[];
}

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  time: string;
}

export type Schedule =
  | { type: "ONE_OFF"; when?: string }
  | { type: "RECURRING"; rule: RecurrenceRule };

export interface Coordinator {
  name?: string;
  phone?: string;
}

export interface TripRequest {
  id: ID;
  tenantId: ID;
  customerId: ID;
  createdVia: CreationMethod;
  stops: Stop[];
  vehicles: TripVehicle[];
  schedule: Schedule;
  status: TripStatus;
  autoAssign: boolean;
  reference?: string;
  coordinator?: Coordinator;
  viewers?: string[];
  costCenter?: string;
  pos?: string;
  createdAt: string;
}
