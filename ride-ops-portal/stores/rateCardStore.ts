'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RateBasis = 'PER_KM' | 'FIXED_LOCATION_PAIR' | 'HOURLY' | 'PACKAGE';
export type TollHandling = 'INCLUDED' | 'EXTRA';
export type ParkingHandling = 'INCLUDED' | 'EXTRA';

export interface RateModifiers {
  minFare?: number;
  nightCharge?: number; // % surcharge
  nightStartHour?: number; // 0-23
  nightEndHour?: number; // 0-23
  waitingPerHour?: number; // paise/hour
  freeWaitingMinutes?: number;
  tollHandling?: TollHandling;
  parkingHandling?: ParkingHandling;
  interStateSurcharge?: number; // %
  deadMileagePerKm?: number; // paise/km
}

export interface FixedPair {
  fromZone: string;
  toZone: string;
  price: number; // paise
}

export interface PackageRate {
  hours: number;
  km: number;
  price: number; // paise
  extraPerHour?: number; // paise/hour
  extraPerKm?: number; // paise/km
}

export interface RateCard {
  id: string;
  tenantId: string;
  vendorId: string;
  customerId: string;
  vehicleTypeId: string;
  basis: RateBasis;
  perKm?: number; // paise/km
  fixedPairs?: FixedPair[];
  hourlyRate?: number; // paise/hour
  package?: PackageRate;
  modifiers?: RateModifiers;
  validFrom: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD, null = indefinite
  version: number;
  createdAt: string;
}

export interface RateAuditEntry {
  id: string;
  timestamp: string;
  action: 'CREATED' | 'SUPERSEDED' | 'DEACTIVATED';
  rateCardId: string;
  vendorId: string;
  vehicleTypeId: string;
  customerId?: string;
  oldRate?: Partial<RateCard>;
  newRate?: Partial<RateCard>;
  changedBy?: string;
  version: number;
}

interface RateCardStore {
  rateCards: RateCard[];
  auditLog: RateAuditEntry[];
  addRateCard: (rc: Omit<RateCard, 'id' | 'createdAt'>) => string;
  createNewVersion: (originalId: string, updates: Partial<RateCard>) => string;
  getRateCardsByTenant: (tenantId: string) => RateCard[];
  getRateCardVersionHistory: (tenantId: string, vendorId: string, customerId: string, vehicleTypeId: string) => RateCard[];
  getApplicableRateCard: (tenantId: string, vendorId: string, customerId: string, vehicleTypeId: string, date?: string) => RateCard | undefined;
  getRateCardById: (id: string) => RateCard | undefined;
  addAuditEntry: (entry: Omit<RateAuditEntry, 'id'>) => void;
  getAuditByTenant: (tenantId: string) => RateAuditEntry[];
}

export const useRateCardStore = create<RateCardStore>()(
  persist(
    (set, get) => ({
      rateCards: [],
      auditLog: [],

      addRateCard: (rc) => {
        const id = crypto.randomUUID();
        set((state) => ({
          rateCards: [...state.rateCards, { ...rc, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      createNewVersion: (originalId, updates) => {
        const original = get().rateCards.find((r) => r.id === originalId);
        if (!original) return '';

        const newVersion = original.version + 1;
        const newId = crypto.randomUUID();
        const today = new Date().toISOString().split('T')[0] || '';

        const newRateCard: RateCard = {
          ...original,
          ...updates,
          id: newId,
          version: newVersion,
          validFrom: updates.validFrom || today,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          rateCards: [...state.rateCards, newRateCard],
        }));

        get().addAuditEntry({
          timestamp: new Date().toISOString(),
          action: 'CREATED',
          rateCardId: newId,
          vendorId: original.vendorId,
          vehicleTypeId: original.vehicleTypeId,
          customerId: original.customerId,
          newRate: newRateCard,
          version: newVersion,
        });

        get().addAuditEntry({
          timestamp: new Date().toISOString(),
          action: 'SUPERSEDED',
          rateCardId: originalId,
          vendorId: original.vendorId,
          vehicleTypeId: original.vehicleTypeId,
          customerId: original.customerId,
          oldRate: original,
          version: original.version,
        });

        return newId;
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
        const effectiveDate = date || new Date().toISOString().split('T')[0] || '';
        const candidates = get().rateCards.filter((r) => {
          return (
            r.tenantId === tenantId &&
            r.vendorId === vendorId &&
            r.customerId === customerId &&
            r.vehicleTypeId === vehicleTypeId &&
            r.validFrom <= effectiveDate &&
            (!r.validTo || r.validTo >= effectiveDate)
          );
        });

        if (candidates.length === 0) return undefined;
        candidates.sort((a, b) => b.version - a.version);
        return candidates[0];
      },

      getRateCardById: (id) => {
        return get().rateCards.find((r) => r.id === id);
      },

      addAuditEntry: (entry) => {
        set((state) => ({
          auditLog: [...state.auditLog, { ...entry, id: crypto.randomUUID() }],
        }));
      },

      getAuditByTenant: (tenantId) => {
        const tenantRateCardIds = new Set(get().rateCards.filter((r) => r.tenantId === tenantId).map((r) => r.id));
        return get().auditLog.filter((a) => tenantRateCardIds.has(a.rateCardId));
      },
    }),
    { name: 'ride-rate-cards' }
  )
);
