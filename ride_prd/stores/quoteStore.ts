import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Offer, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface QuoteStore {
  offers: Offer[];
  addOffer: (offer: Omit<Offer, "priceId">) => Offer;
  getOfferByPriceId: (priceId: ID) => Offer | undefined;
  getOffersByTenant: (tenantId: ID) => Offer[];
  expireOldOffers: () => void;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      offers: [],
      addOffer: (offer) => {
        const priceId = id();
        const newOffer: Offer = {
          ...offer,
          priceId,
        };
        set((state) => ({
          offers: [...state.offers, newOffer],
        }));
        return newOffer;
      },
      getOfferByPriceId: (priceId) => {
        const now = new Date();
        return get().offers.find((o) => o.priceId === priceId && new Date(o.expiresAt) > now);
      },
      getOffersByTenant: (tenantId) => {
        const now = new Date();
        return get()
          .offers.filter((o) => o.tenantId === tenantId && new Date(o.expiresAt) > now);
      },
      expireOldOffers: () => {
        const now = new Date();
        set((state) => ({
          offers: state.offers.filter((o) => new Date(o.expiresAt) > now),
        }));
      },
    }),
    {
      name: "ride-quotes",
    }
  )
);
