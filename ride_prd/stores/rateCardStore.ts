import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RateCard, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface RateCardStore {
  rateCards: RateCard[];
  addRateCard: (rc: Omit<RateCard, "id">) => void;
  createNewVersion: (rateCardId: ID, updates: Partial<RateCard>) => void;
  getRateCardsByTenant: (tenantId: ID) => RateCard[];
  getRateCardVersionHistory: (tenantId: ID, vendorId: ID, customerId: ID, vehicleTypeId: ID) => RateCard[];
  getApplicableRateCard: (tenantId: ID, vendorId: ID, customerId: ID, vehicleTypeId: ID, date: string) => RateCard | undefined;
}

const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);
const nextYearStr = nextYear.toISOString().split("T")[0];

const SEED_RATE_CARDS: RateCard[] = [
  {
    id: "RC1",
    tenantId: "T1",
    vendorId: "V1",
    customerId: "C1",
    vehicleTypeId: "VT1",
    basis: "PER_KM",
    perKm: 20,
    modifiers: {
      minFare: 200,
      nightCharge: 50,
      waitingPerHour: 100,
      tollHandling: "EXTRA",
      parkingHandling: "EXTRA",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
  {
    id: "RC2",
    tenantId: "T1",
    vendorId: "V1",
    customerId: "C1",
    vehicleTypeId: "VT2",
    basis: "PER_KM",
    perKm: 25,
    modifiers: {
      minFare: 250,
      nightCharge: 75,
      waitingPerHour: 150,
      tollHandling: "INCLUDED",
      parkingHandling: "EXTRA",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
  {
    id: "RC3",
    tenantId: "T1",
    vendorId: "V1",
    customerId: "C2",
    vehicleTypeId: "VT1",
    basis: "HOURLY",
    hourlyRate: 500,
    modifiers: {
      minFare: 500,
      waitingPerHour: 0,
      tollHandling: "EXTRA",
      parkingHandling: "EXTRA",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
  {
    id: "RC4",
    tenantId: "T1",
    vendorId: "V1",
    customerId: "C3",
    vehicleTypeId: "VT3",
    basis: "PACKAGE",
    package: {
      hours: 8,
      km: 80,
      price: 4000,
      extraPerHour: 300,
      extraPerKm: 15,
    },
    modifiers: {
      minFare: 2000,
      tollHandling: "INCLUDED",
      parkingHandling: "INCLUDED",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
  {
    id: "RC5",
    tenantId: "T2",
    vendorId: "V4",
    customerId: "C4",
    vehicleTypeId: "VT5",
    basis: "PER_KM",
    perKm: 22,
    modifiers: {
      minFare: 220,
      nightCharge: 60,
      waitingPerHour: 120,
      tollHandling: "INCLUDED",
      parkingHandling: "EXTRA",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
  {
    id: "RC6",
    tenantId: "T3",
    vendorId: "V6",
    customerId: "C6",
    vehicleTypeId: "VT7",
    basis: "FIXED_LOCATION_PAIR",
    fixedPairs: [
      { fromZone: "Airport", toZone: "Downtown", price: 300 },
      { fromZone: "Airport", toZone: "Marina", price: 350 },
      { fromZone: "Downtown", toZone: "Marina", price: 150 },
    ],
    modifiers: {
      minFare: 200,
      tollHandling: "INCLUDED",
      parkingHandling: "INCLUDED",
    },
    validFrom: "2024-01-01",
    validTo: nextYearStr,
    version: 1,
  },
];

export const useRateCardStore = create<RateCardStore>()(
  persist(
    (set, get) => ({
      rateCards: SEED_RATE_CARDS,
      addRateCard: (rc) => {
        set((state) => ({
          rateCards: [...state.rateCards, { ...rc, id: id() }],
        }));
      },
      createNewVersion: (rateCardId, updates) => {
        const original = get().rateCards.find((r) => r.id === rateCardId);
        if (!original) return;

        const today = new Date().toISOString().split("T")[0];
        const newRateCard: RateCard = {
          ...original,
          ...updates,
          id: id(),
          tenantId: original.tenantId,
          vendorId: original.vendorId,
          customerId: original.customerId,
          vehicleTypeId: original.vehicleTypeId,
          basis: updates.basis ?? original.basis,
          version: original.version + 1,
          validFrom: today,
          validTo: updates.validTo ?? original.validTo,
        } as RateCard;

        set((state) => ({
          rateCards: [...state.rateCards, newRateCard],
        }));
      },
      getRateCardsByTenant: (tenantId) => {
        return get().rateCards.filter((r) => r.tenantId === tenantId);
      },
      getRateCardVersionHistory: (tenantId, vendorId, customerId, vehicleTypeId) => {
        return get()
          .rateCards.filter(
            (r) =>
              r.tenantId === tenantId &&
              r.vendorId === vendorId &&
              r.customerId === customerId &&
              r.vehicleTypeId === vehicleTypeId
          )
          .sort((a, b) => b.version - a.version);
      },
      getApplicableRateCard: (tenantId, vendorId, customerId, vehicleTypeId, date) => {
        const candidates = get().rateCards.filter(
          (r) =>
            r.tenantId === tenantId &&
            r.vendorId === vendorId &&
            r.customerId === customerId &&
            r.vehicleTypeId === vehicleTypeId &&
            r.validFrom <= date &&
            (!r.validTo || r.validTo >= date)
        );
        if (candidates.length === 0) return undefined;
        return candidates.sort((a, b) => b.version - a.version)[0];
      },
    }),
    {
      name: "ride-rate-cards",
    }
  )
);
