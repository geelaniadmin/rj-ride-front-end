import { useTripStore } from "@/stores/tripStore";
import { useQuoteStore } from "@/stores/quoteStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { Offer } from "@/lib/types";

const SEED_PRICES = [45000, 52000, 38000];

export function seedTrips() {
  const tripStore = useTripStore.getState();
  const quoteStore = useQuoteStore.getState();
  const vehicleStore = useVehicleStore.getState();
  const driverStore = useDriverStore.getState();

  // Only seed if no trips exist for the default tenant
  const existing = tripStore.getTripsByTenant("T1");
  if (existing.length > 0) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  const tomorrowISO = tomorrow.toISOString();
  const tomorrowDate = tomorrowISO.split("T")[0] || "";

  // Helper: create a long-lived offer in the quote store
  const createOffer = (price: number, tenantId: string, customerId: string, vehicleTypeId: string): string => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const offer: Omit<Offer, "priceId"> = {
      tenantId,
      rateCardId: "RC1",
      rateCardVersion: 1,
      customerId,
      vehicleTypeId,
      basis: "PER_KM",
      price,
      currency: "INR",
      freeCancellationHours: 2,
      minLeadTimeHours: 1,
      quotedAt: tomorrowDate,
      expiresAt: expiresAt.toISOString(),
    };
    const created = quoteStore.addOffer(offer);
    return created.priceId;
  };

  // ── Trip 1: IndiGo → KIA to ITC Gardenia (ASSIGNED — shows in driver inbox + dispatch) ──
  const priceId1 = createOffer(SEED_PRICES[0]!, "T1", "C1", "VT1");
  tripStore.addTrip({
    tenantId: "T1",
    customerId: "C1",
    createdVia: "MANUAL",
    stops: [
      {
        seq: 0,
        type: "PICKUP",
        locationType: "AIRPORT",
        address: "Kempegowda International Airport (KIA), Bengaluru",
        lat: 13.1979,
        lng: 77.7063,
        plannedTime: tomorrowISO,
        flightNumber: "6E-123",
      },
      {
        seq: 1,
        type: "DROP",
        locationType: "HOTEL",
        address: "ITC Gardenia, Residency Road, Bengaluru",
        lat: 12.9698,
        lng: 77.5922,
      },
    ],
    vehicles: [
      {
        id: "SEED-V1",
        requestedVehicleTypeId: "VT1", // Sedan
        priceId: priceId1,
        lockedPrice: SEED_PRICES[0],
        lockedRateCardVersion: 1,
        vehicleId: "VH1", // Maruti Swift
        driverId: "D1", // Rajesh Kumar
        status: "ASSIGNED",
        pax: [
          {
            id: "SEED-P1",
            name: "Priya Sharma",
            phone: "+919123456789",
            email: "priya@indigo.local",
            pnr: "6E-BLR-001",
          },
        ],
        otp: {
          pickup: "4821",
          drop: "4821",
        },
      },
    ],
    schedule: { type: "ONE_OFF", when: tomorrowISO },
    status: "ASSIGNED",
    autoAssign: true,
    reference: "RIDE-SEED-001",
    coordinator: { name: "Rohan Kumar", phone: "+919111222333" },
    costCenter: "AIR-HUB-001",
  });

  // ── Trip 2: Acme Logistics → Manyata Tech Park to Sheraton Grand (EN_ROUTE_PICKUP — shows on tracking) ──
  const priceId2 = createOffer(SEED_PRICES[1]!, "T1", "C2", "VT2");
  tripStore.addTrip({
    tenantId: "T1",
    customerId: "C2",
    createdVia: "MANUAL",
    stops: [
      {
        seq: 0,
        type: "PICKUP",
        locationType: "ADDRESS",
        address: "Manyata Tech Park, Nagawara, Bengaluru",
        lat: 13.0327,
        lng: 77.6255,
        plannedTime: tomorrowISO,
      },
      {
        seq: 1,
        type: "DROP",
        locationType: "HOTEL",
        address: "Sheraton Grand Bengaluru, Brigade Gateway",
        lat: 12.9516,
        lng: 77.6421,
      },
    ],
    vehicles: [
      {
        id: "SEED-V2",
        requestedVehicleTypeId: "VT2", // SUV
        priceId: priceId2,
        lockedPrice: SEED_PRICES[1],
        lockedRateCardVersion: 1,
        vehicleId: "VH2", // Mahindra XUV700
        driverId: "D2", // Suresh Gowda
        status: "EN_ROUTE_PICKUP",
        pax: [
          { id: "SEED-P2", name: "Vikram Reddy", phone: "+919988776655", employeeId: "EMP-ACM-001" },
        ],
        otp: {
          pickup: "4821",
          drop: "4821",
        },
      },
    ],
    schedule: { type: "ONE_OFF", when: tomorrowISO },
    status: "IN_PROGRESS",
    autoAssign: true,
    reference: "RIDE-SEED-002",
    coordinator: { name: "Ananya Singh", phone: "+919123456789" },
    costCenter: "LOG-KA-001",
  });

  // ── Trip 3: TechCorp India → Electronic City to Hilton Bengaluru (CONFIRMED — in trips list only) ──
  const priceId3 = createOffer(SEED_PRICES[2]!, "T1", "C3", "VT1");
  tripStore.addTrip({
    tenantId: "T1",
    customerId: "C3",
    createdVia: "MANUAL",
    stops: [
      {
        seq: 0,
        type: "PICKUP",
        locationType: "ADDRESS",
        address: "Electronic City Phase 1, Hosur Road, Bengaluru",
        lat: 12.8399,
        lng: 77.677,
        plannedTime: tomorrowISO,
      },
      {
        seq: 1,
        type: "DROP",
        locationType: "HOTEL",
        address: "Hilton Bengaluru, Embassy Golf Links",
        lat: 12.9344,
        lng: 77.6106,
      },
    ],
    vehicles: [
      {
        id: "SEED-V3",
        requestedVehicleTypeId: "VT1", // Sedan
        priceId: priceId3,
        lockedPrice: SEED_PRICES[2],
        lockedRateCardVersion: 1,
        vehicleId: "VH3", // Force Tempo Traveller
        driverId: "D3", // Anand Rao
        status: "PENDING",
        pax: [
          { id: "SEED-P3", name: "Anjali Gupta", phone: "+919555666777", employeeId: "EMP-TC-001" },
        ],
        otp: {
          pickup: "4821",
          drop: "4821",
        },
      },
    ],
    schedule: { type: "ONE_OFF", when: tomorrowISO },
    status: "CONFIRMED",
    autoAssign: false,
    reference: "RIDE-SEED-003",
    costCenter: "TECH-BNG-001",
  });
}
