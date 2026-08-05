import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BillingStatus = "UNBILLED" | "STATEMENTED" | "RECONCILED";
export type OperatorFeeType = "FLAT" | "PERCENT" | "TIERED";

export interface OperatorFeeConfig {
  type: OperatorFeeType;
  amount?: number; // FLAT: amount in currency, PERCENT: percentage
  tiers?: Array<{ minAmount: number; maxAmount?: number; feePercent: number }>; // TIERED
}

export interface BillingLine {
  id: string;
  tripId: string;
  vehicleId: string;
  priceId: string;
  lockedPrice: number;
  lockedRateCardVersion: number;
  customerId: string;
  currency: string;
  status: BillingStatus;
  createdAt: string;
  statemented?: string; // ISO timestamp when statemented
  reconciled?: string;
}

export interface BillableTrip {
  id: string;
  tripId: string;
  tenantId: string;
  customerId: string;
  lines: BillingLine[];
  subtotal: number;
  operatorFee: number;
  total: number;
  currency: string;
  status: BillingStatus;
  createdAt: string;
  statemented?: string;
}

export interface SubVendorInvoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  uploadedAt: string;
  fileName: string;
  items: Array<{
    invoiceLineId: string;
    tripId: string;
    amount: number;
    currency: string;
  }>;
}

export interface ReconciliationMatch {
  invoiceLineId: string;
  tripId: string;
  invoiceAmount: number;
  systemAmount: number;
  matched: boolean;
  reason?: string;
}

export interface Adjustment {
  id: string;
  billingLineId: string;
  reason: string;
  amount: number; // positive or negative
  approvedBy?: string;
  createdAt: string;
}

export interface Voucher {
  id: string;
  tripId: string;
  type: "TRIP" | "PAX";
  passengerPaxId?: string;
  amount: number;
  currency: string;
  language: string;
  generatedAt: string;
  documentUrl?: string; // Mock URL
}

interface BillingStore {
  operatorFees: Record<string, OperatorFeeConfig>; // tenantId -> config
  billingLines: BillingLine[];
  billableTrips: BillableTrip[];
  subVendorInvoices: SubVendorInvoice[];
  reconciliations: ReconciliationMatch[];
  adjustments: Adjustment[];
  vouchers: Voucher[];

  // Operator fee management
  setOperatorFeeConfig: (tenantId: string, config: OperatorFeeConfig) => void;
  getOperatorFeeConfig: (tenantId: string) => OperatorFeeConfig;

  // Billing line operations
  addBillingLine: (line: Omit<BillingLine, "id" | "createdAt">) => BillingLine;
  updateBillingLineStatus: (id: string, status: BillingStatus, statemented?: string) => void;

  // Billable trips
  createBillableTrip: (trip: Omit<BillableTrip, "id" | "createdAt">) => BillableTrip;
  getBillableTripsByCustomer: (customerId: string, dateFrom?: string, dateTo?: string) => BillableTrip[];
  getBillableTripsByTenant: (tenantId: string, status?: BillingStatus) => BillableTrip[];

  // Sub-vendor reconciliation
  uploadSubVendorInvoice: (invoice: Omit<SubVendorInvoice, "id" | "uploadedAt">) => SubVendorInvoice;
  reconcileInvoice: (invoiceId: string) => ReconciliationMatch[];

  // Adjustments
  addAdjustment: (adjustment: Omit<Adjustment, "id" | "createdAt">) => Adjustment;
  getAdjustmentsByBillingLine: (billingLineId: string) => Adjustment[];

  // Vouchers
  generateVouchers: (tripId: string, paxIds?: string[], language?: string) => Voucher[];
  getVouchersByTrip: (tripId: string) => Voucher[];
}

export const useBillingStore = create<BillingStore>()(
  persist(
    (set, get) => ({
      operatorFees: {
        T1: { type: "PERCENT", amount: 15 },
        T2: { type: "FLAT", amount: 50 },
        T3: {
          type: "TIERED",
          tiers: [
            { minAmount: 0, maxAmount: 1000, feePercent: 10 },
            { minAmount: 1000, maxAmount: 5000, feePercent: 12 },
            { minAmount: 5000, feePercent: 15 },
          ],
        },
      },
      billingLines: [],
      billableTrips: [],
      subVendorInvoices: [],
      reconciliations: [],
      adjustments: [],
      vouchers: [],

      setOperatorFeeConfig: (tenantId, config) => {
        set((state) => ({
          operatorFees: { ...state.operatorFees, [tenantId]: config },
        }));
      },

      getOperatorFeeConfig: (tenantId) => {
        return get().operatorFees[tenantId] || { type: "PERCENT", amount: 10 };
      },

      addBillingLine: (line) => {
        const newLine: BillingLine = {
          ...line,
          id: `BL-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          billingLines: [...state.billingLines, newLine],
        }));
        return newLine;
      },

      updateBillingLineStatus: (id, status, statemented) => {
        set((state) => ({
          billingLines: state.billingLines.map((line) =>
            line.id === id ? { ...line, status, statemented: statemented || line.statemented } : line
          ),
        }));
      },

      createBillableTrip: (trip) => {
        const config = get().getOperatorFeeConfig(trip.tenantId);
        let operatorFee = 0;

        if (config.type === "FLAT") {
          operatorFee = config.amount || 0;
        } else if (config.type === "PERCENT") {
          operatorFee = (trip.subtotal * (config.amount || 0)) / 100;
        } else if (config.type === "TIERED" && config.tiers) {
          const tier = config.tiers.find(
            (t) => trip.subtotal >= t.minAmount && (!t.maxAmount || trip.subtotal < t.maxAmount)
          );
          operatorFee = tier ? (trip.subtotal * tier.feePercent) / 100 : 0;
        }

        const newTrip: BillableTrip = {
          ...trip,
          id: `BT-${Date.now()}`,
          operatorFee,
          total: trip.subtotal + operatorFee,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          billableTrips: [...state.billableTrips, newTrip],
        }));

        return newTrip;
      },

      getBillableTripsByCustomer: (customerId, dateFrom, dateTo) => {
        const trips = get().billableTrips.filter((t) => t.customerId === customerId);
        if (!dateFrom || !dateTo) return trips;

        const fromTime = new Date(dateFrom).getTime();
        const toTime = new Date(dateTo).getTime();

        return trips.filter((t) => {
          const tripTime = new Date(t.createdAt).getTime();
          return tripTime >= fromTime && tripTime <= toTime;
        });
      },

      getBillableTripsByTenant: (tenantId, status) => {
        const trips = get().billableTrips.filter((t) => t.tenantId === tenantId);
        return status ? trips.filter((t) => t.status === status) : trips;
      },

      uploadSubVendorInvoice: (invoice) => {
        const newInvoice: SubVendorInvoice = {
          ...invoice,
          id: `SVI-${Date.now()}`,
          uploadedAt: new Date().toISOString(),
        };

        set((state) => ({
          subVendorInvoices: [...state.subVendorInvoices, newInvoice],
        }));

        return newInvoice;
      },

      reconcileInvoice: (invoiceId) => {
        const invoice = get().subVendorInvoices.find((i) => i.id === invoiceId);
        if (!invoice) return [];

        const billableTrips = get().billableTrips;
        const matches: ReconciliationMatch[] = invoice.items.map((item) => {
          const trip = billableTrips.find((t) => t.tripId === item.tripId);
          const matched = !!(trip && trip.total === item.amount);
          const reason = !trip ? "Trip not found" : !matched ? "Amount mismatch" : undefined;

          return {
            invoiceLineId: item.invoiceLineId,
            tripId: item.tripId,
            invoiceAmount: item.amount,
            systemAmount: trip?.total || 0,
            matched,
            reason,
          };
        });

        set((state) => ({
          reconciliations: [...state.reconciliations, ...matches],
        }));

        return matches;
      },

      addAdjustment: (adjustment) => {
        const newAdjustment: Adjustment = {
          ...adjustment,
          id: `ADJ-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          adjustments: [...state.adjustments, newAdjustment],
        }));

        return newAdjustment;
      },

      getAdjustmentsByBillingLine: (billingLineId) => {
        return get().adjustments.filter((a) => a.billingLineId === billingLineId);
      },

      generateVouchers: (tripId, paxIds, language = "en") => {
        const trip = get().billableTrips.find((t) => t.tripId === tripId);
        if (!trip) return [];

        const vouchers: Voucher[] = [];

        // Trip voucher
        vouchers.push({
          id: `VCH-TRIP-${Date.now()}`,
          tripId,
          type: "TRIP",
          amount: trip.total,
          currency: trip.currency,
          language,
          generatedAt: new Date().toISOString(),
          documentUrl: `https://ride.mock/vouchers/trip-${tripId}.pdf`,
        });

        // Pax vouchers
        if (paxIds) {
          paxIds.forEach((paxId) => {
            vouchers.push({
              id: `VCH-PAX-${paxId}-${Date.now()}`,
              tripId,
              type: "PAX",
              passengerPaxId: paxId,
              amount: trip.total / (paxIds.length || 1),
              currency: trip.currency,
              language,
              generatedAt: new Date().toISOString(),
              documentUrl: `https://ride.mock/vouchers/pax-${paxId}.pdf`,
            });
          });
        }

        set((state) => ({
          vouchers: [...state.vouchers, ...vouchers],
        }));

        return vouchers;
      },

      getVouchersByTrip: (tripId) => {
        return get().vouchers.filter((v) => v.tripId === tripId);
      },
    }),
    {
      name: "ride-billing",
    }
  )
);
