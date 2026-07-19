import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./client";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status < 500) return false;
          return failureCount < 3;
        },
      },
    },
  });
}

type FiltersShape = Record<string, string | number | boolean | undefined | null>;

export const keys = {
  me: () => ["me"] as const,

  trips: {
    all: () => ["trips"] as const,
    list: (filters?: FiltersShape) =>
      ["trips", "list", filters ?? {}] as const,
    detail: (id: string) => ["trips", "detail", id] as const,
  },

  fleet: {
    all: () => ["fleet"] as const,
    vehicles: {
      list: (filters?: FiltersShape) =>
        ["fleet", "vehicles", "list", filters ?? {}] as const,
      detail: (id: string) => ["fleet", "vehicles", "detail", id] as const,
    },
    drivers: {
      list: (filters?: FiltersShape) =>
        ["fleet", "drivers", "list", filters ?? {}] as const,
      detail: (id: string) => ["fleet", "drivers", "detail", id] as const,
    },
  },

  pricing: {
    all: () => ["pricing"] as const,
    rateCards: {
      list: (filters?: FiltersShape) =>
        ["pricing", "rate-cards", "list", filters ?? {}] as const,
      detail: (id: string) => ["pricing", "rate-cards", "detail", id] as const,
    },
  },

  billing: {
    all: () => ["billing"] as const,
    invoices: {
      list: (filters?: FiltersShape) =>
        ["billing", "invoices", "list", filters ?? {}] as const,
      detail: (id: string) => ["billing", "invoices", "detail", id] as const,
    },
  },

  dispatch: {
    all: () => ["dispatch"] as const,
    assignments: {
      list: (filters?: FiltersShape) =>
        ["dispatch", "assignments", "list", filters ?? {}] as const,
      detail: (id: string) =>
        ["dispatch", "assignments", "detail", id] as const,
    },
  },

  safety: {
    all: () => ["safety"] as const,
    sos: {
      list: (filters?: FiltersShape) =>
        ["safety", "sos", "list", filters ?? {}] as const,
      detail: (id: string) => ["safety", "sos", "detail", id] as const,
    },
  },
} as const;
