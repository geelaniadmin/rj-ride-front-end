import { useTripStore } from "@/stores/tripStore";
import { useQuoteStore } from "@/stores/quoteStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useDriverStore } from "@/stores/driverStore";
import { useBillingStore } from "@/stores/billingStore";
import { Offer } from "@/lib/types";

const SEED_PRICES = [2800, 3500, 2200, 1800, 4200]; // INR: Sedan, SUV, Sedan, Sedan, SUV

export function seedTrips() {
  const tripStore = useTripStore.getState();
  const quoteStore = useQuoteStore.getState();
  const vehicleStore = useVehicleStore.getState();
  const driverStore = useDriverStore.getState();

  // Only seed if no trips exist for the default tenant
  const existing = tripStore.getTripsByTenant("T1");
  if (existing.length > 0) {
    // Ensure Trip 1 has a pax with id "PAX001" for PassengerApp demo
    const hasPax001 = existing.some((t) => t.vehicles.some((v) => v.pax.some((p) => p.id === "PAX001")));
    if (!hasPax001) {
      const trip1 = existing.find((t) => t.vehicles.some((v) => v.driverId === "D1"));
      if (trip1) {
        const updated = trip1.vehicles.map((v) =>
          v.driverId === "D1" && v.pax.length > 0
            ? { ...v, pax: v.pax.map((p) => ({ ...p, id: "PAX001" })) }
            : v
        );
        tripStore.updateTrip(trip1.id, { vehicles: updated });
      }
    }
    return;
  }

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
            id: "PAX001", // Matches DEMO_PAX_ID in PassengerApp
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

  // ── Trip 4: IndiGo → KIA to Hilton BLR (COMPLETED — billing auto-created) ──
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  yesterday.setHours(10, 0, 0, 0);
  const yesterdayISO = yesterday.toISOString();

  const priceId4 = createOffer(SEED_PRICES[3]!, "T1", "C1", "VT1");
  const trip4Id = tripStore.addTrip({
    tenantId: "T1",
    customerId: "C1",
    createdVia: "API_PAX",
    stops: [
      {
        seq: 0,
        type: "PICKUP",
        locationType: "AIRPORT",
        address: "Kempegowda International Airport, Bengaluru",
        lat: 13.1979,
        lng: 77.7063,
        plannedTime: yesterdayISO,
        flightNumber: "6E-456",
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
        id: "SEED-V4",
        requestedVehicleTypeId: "VT1",
        priceId: priceId4,
        lockedPrice: SEED_PRICES[3],
        lockedRateCardVersion: 1,
        vehicleId: "VH1",
        driverId: "D1",
        status: "COMPLETED",
        pax: [
          { id: "SEED-P4", name: "Ravi Desai", phone: "+919876543210", pnr: "6E-BLR-004" },
        ],
        otp: { pickup: "4821", drop: "4821", pickupVerified: true, dropVerified: true },
      },
    ],
    schedule: { type: "ONE_OFF", when: yesterdayISO },
    status: "COMPLETED",
    autoAssign: true,
    reference: "RIDE-SEED-004",
    costCenter: "AIR-HUB-001",
  });

  // ── Trip 5: Acme Logistics → BLR to Whitefield (COMPLETED — billing auto-created, multi-currency demo) ──
  const priceId5 = createOffer(SEED_PRICES[4]!, "T1", "C2", "VT2");
  const trip5Id = tripStore.addTrip({
    tenantId: "T1",
    customerId: "C2",
    createdVia: "API_VEHICLE_COUNT",
    stops: [
      {
        seq: 0,
        type: "PICKUP",
        locationType: "ADDRESS",
        address: "Manyata Tech Park, Nagawara, Bengaluru",
        lat: 13.0327,
        lng: 77.6255,
        plannedTime: yesterdayISO,
      },
      {
        seq: 1,
        type: "DROP",
        locationType: "ADDRESS",
        address: "Whitefield Main Road, Bengaluru",
        lat: 12.9698,
        lng: 77.7499,
      },
    ],
    vehicles: [
      {
        id: "SEED-V5",
        requestedVehicleTypeId: "VT2",
        priceId: priceId5,
        lockedPrice: SEED_PRICES[4],
        lockedRateCardVersion: 1,
        vehicleId: "VH2",
        driverId: "D2",
        status: "COMPLETED",
        pax: [
          { id: "SEED-P5", name: "Meera Nair", phone: "+919123450987", employeeId: "EMP-ACM-002" },
        ],
        otp: { pickup: "1234", drop: "5678", pickupVerified: true, dropVerified: true },
      },
    ],
    schedule: { type: "ONE_OFF", when: yesterdayISO },
    status: "COMPLETED",
    autoAssign: true,
    reference: "RIDE-SEED-005",
    costCenter: "LOG-KA-002",
  });

  // Auto-create billing for completed trips after seeding
  // The advanceVehicleStatus doesn't auto-fire on seed, so we create billing directly
  const billingStore = useBillingStore.getState();

  for (const [tripIdx, tripId] of [trip4Id, trip5Id].entries()) {
    const trip = tripStore.getTripById(tripId);
    if (!trip) continue;

    const subtotal = trip.vehicles.reduce((sum, v) => sum + (v.lockedPrice || 0), 0);
    const config = billingStore.getOperatorFeeConfig(trip.tenantId);
    let operatorFee = 0;
    if (config.type === "FLAT") {
      operatorFee = config.amount || 0;
    } else if (config.type === "PERCENT") {
      operatorFee = (subtotal * (config.amount || 0)) / 100;
    } else if (config.type === "TIERED") {
      const tier = config.tiers?.find((t) => subtotal >= t.minAmount && (!t.maxAmount || subtotal < t.maxAmount));
      operatorFee = tier ? (subtotal * tier.feePercent) / 100 : 0;
    }

    const billingLines = trip.vehicles.map((v) =>
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

    tripStore.updateTrip(tripId, { status: "BILLED" });
  }
}
