import { RateCard, Offer, LocationType } from "@/lib/types";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useQuoteStore } from "@/stores/quoteStore";
import { id } from "@/lib/mock";

export interface QuoteInput {
  tenantId: string;
  vendorId: string;
  customerId: string;
  vehicleTypeId: string;
  quotedAt: string;
  currency: string;
  locationType?: LocationType;
  distance?: number;
  hours?: number;
  fromZone?: string;
  toZone?: string;
}

function calculatePrice(rateCard: RateCard, input: Partial<QuoteInput>): { price: number; isApproximate: boolean } {
  let price = 0;
  let isApproximate = false;

  if (rateCard.basis === "PER_KM") {
    if (!input.distance) return { price: 0, isApproximate: true };
    price = input.distance * (rateCard.perKm || 0);
    if (rateCard.modifiers?.minFare && price < rateCard.modifiers.minFare) {
      price = rateCard.modifiers.minFare;
    }
    if (input.locationType === "AIRPORT" || input.locationType === "RAIL") {
      isApproximate = true;
    }
  } else if (rateCard.basis === "HOURLY") {
    if (!input.hours) return { price: 0, isApproximate: true };
    price = input.hours * (rateCard.hourlyRate || 0);
    if (rateCard.modifiers?.minFare && price < rateCard.modifiers.minFare) {
      price = rateCard.modifiers.minFare;
    }
  } else if (rateCard.basis === "FIXED_LOCATION_PAIR") {
    if (input.fromZone && input.toZone && rateCard.fixedPairs) {
      const pair = rateCard.fixedPairs.find((p) => p.fromZone === input.fromZone && p.toZone === input.toZone);
      price = pair?.price || 0;
    }
  } else if (rateCard.basis === "PACKAGE") {
    if (!rateCard.package) return { price: 0, isApproximate: true };
    price = rateCard.package.price;
    if (input.hours && input.hours > rateCard.package.hours && rateCard.package.extraPerHour) {
      price += (input.hours - rateCard.package.hours) * rateCard.package.extraPerHour;
    }
    if (input.distance && input.distance > rateCard.package.km && rateCard.package.extraPerKm) {
      price += (input.distance - rateCard.package.km) * rateCard.package.extraPerKm;
    }
  }

  return { price, isApproximate };
}

export function getOffers(input: QuoteInput): Offer[] {
  const rateCardStore = useRateCardStore.getState();
  const quoteStore = useQuoteStore.getState();

  const today = input.quotedAt ?? new Date().toISOString().split("T")[0];
  const rateCard = rateCardStore.getApplicableRateCard(input.tenantId, input.vendorId, input.customerId, input.vehicleTypeId, today);

  if (!rateCard) {
    return [];
  }

  const { price, isApproximate } = calculatePrice(rateCard, input);

  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 15);

  const offer: Offer = {
    priceId: id(),
    tenantId: input.tenantId,
    rateCardId: rateCard.id,
    rateCardVersion: rateCard.version,
    customerId: input.customerId,
    vehicleTypeId: input.vehicleTypeId,
    basis: rateCard.basis,
    price,
    currency: input.currency,
    freeCancellationHours: 2,
    minLeadTimeHours: 1,
    quotedAt: input.quotedAt,
    expiresAt: expiryTime.toISOString(),
  };

  quoteStore.addOffer(offer);
  return [offer];
}

export function getOfferDetails(offer: Offer): { priceLabel: string; validityMins: number } {
  const expiryTime = new Date(offer.expiresAt);
  const now = new Date();
  const validityMins = Math.ceil((expiryTime.getTime() - now.getTime()) / (1000 * 60));

  const priceLabel = `₹${offer.price}`;

  return { priceLabel, validityMins };
}
