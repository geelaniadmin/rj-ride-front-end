import { RateCard, RateBasis } from '@/stores/rateCardStore';

export interface FareInput {
  rateCard: RateCard;
  distanceKm?: number;
  hours?: number;
  fromZone?: string;
  toZone?: string;
  isNight?: boolean;
  waitingMinutes?: number;
  tollApplicable?: boolean;
}

export interface FareBreakdown {
  baseFare: number; // paise
  nightSurcharge: number; // paise
  waitingCharge: number; // paise
  tollCharge: number; // paise (placeholder if EXTRA)
  total: number; // paise
  isApproximate: boolean; // true if basis is FIXED_LOCATION_PAIR
}

function findFixedPairPrice(rc: RateCard, fromZone?: string, toZone?: string): number | undefined {
  if (!rc.fixedPairs || !fromZone || !toZone) return undefined;
  const pair = rc.fixedPairs.find((p) => p.fromZone === fromZone && p.toZone === toZone);
  return pair?.price;
}

export function computeFare(input: FareInput): FareBreakdown {
  const { rateCard, distanceKm = 0, hours = 0, fromZone, toZone, isNight = false, waitingMinutes = 0, tollApplicable = false } = input;

  let baseFare = 0;
  let isApproximate = false;

  // Compute base fare by basis
  switch (rateCard.basis) {
    case 'PER_KM':
      if (rateCard.perKm) {
        baseFare = Math.round(distanceKm * rateCard.perKm);
        if (rateCard.modifiers?.minFare) {
          baseFare = Math.max(baseFare, rateCard.modifiers.minFare);
        }
      }
      break;

    case 'HOURLY':
      if (rateCard.hourlyRate) {
        baseFare = Math.round(hours * rateCard.hourlyRate);
        if (rateCard.modifiers?.minFare) {
          baseFare = Math.max(baseFare, rateCard.modifiers.minFare);
        }
      }
      break;

    case 'FIXED_LOCATION_PAIR':
      const fixedPrice = findFixedPairPrice(rateCard, fromZone, toZone);
      if (fixedPrice) {
        baseFare = fixedPrice;
        isApproximate = true;
      }
      break;

    case 'PACKAGE':
      if (rateCard.package) {
        baseFare = rateCard.package.price;
        const extraHours = Math.max(0, hours - rateCard.package.hours);
        const extraKm = Math.max(0, distanceKm - rateCard.package.km);
        if (rateCard.package.extraPerHour && extraHours > 0) {
          baseFare += Math.round(extraHours * rateCard.package.extraPerHour);
        }
        if (rateCard.package.extraPerKm && extraKm > 0) {
          baseFare += Math.round(extraKm * rateCard.package.extraPerKm);
        }
      }
      break;
  }

  // Apply modifiers
  let nightSurcharge = 0;
  if (isNight && rateCard.modifiers?.nightCharge) {
    nightSurcharge = Math.round((baseFare * rateCard.modifiers.nightCharge) / 100);
  }

  let waitingCharge = 0;
  if (rateCard.modifiers?.waitingPerHour) {
    const freeMinutes = rateCard.modifiers.freeWaitingMinutes || 10;
    const chargeableMinutes = Math.max(0, waitingMinutes - freeMinutes);
    waitingCharge = Math.round((chargeableMinutes / 60) * rateCard.modifiers.waitingPerHour);
  }

  let tollCharge = 0;
  if (tollApplicable && rateCard.modifiers?.tollHandling === 'EXTRA') {
    tollCharge = 10000; // ₹100 placeholder
  }

  const total = baseFare + nightSurcharge + waitingCharge + tollCharge;

  return {
    baseFare,
    nightSurcharge,
    waitingCharge,
    tollCharge,
    total,
    isApproximate,
  };
}
