import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  partnerId: string;
  url: string;
  events: string[];
  apiKey: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: "pending" | "success" | "failed" | "retry";
  statusCode?: number;
  error?: string;
  attempt: number;
  nextRetry?: string;
  createdAt: string;
}

interface WebhookStore {
  endpoints: WebhookEndpoint[];
  logs: WebhookLog[];
  addEndpoint: (endpoint: Omit<WebhookEndpoint, "id" | "createdAt">) => WebhookEndpoint;
  removeEndpoint: (id: string) => void;
  toggleEndpoint: (id: string) => void;
  addLog: (log: Omit<WebhookLog, "id" | "createdAt">) => WebhookLog;
  updateLog: (id: string, updates: Partial<WebhookLog>) => void;
  getEndpointsByTenant: (tenantId: string) => WebhookEndpoint[];
  getLogsByWebhook: (webhookId: string) => WebhookLog[];
}

export const useWebhookStore = create<WebhookStore>()(
  persist(
    (set, get) => ({
      endpoints: [
        {
          id: "WH1",
          tenantId: "T1",
          partnerId: "RISMA",
          url: "https://risma.internal/webhooks/trips",
          events: ["TRIP_CONFIRMED", "TRIP_ASSIGNED", "TRIP_COMPLETED"],
          apiKey: "sk_live_risma_123abc",
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      logs: [],
      addEndpoint: (endpoint) => {
        const newEndpoint: WebhookEndpoint = {
          ...endpoint,
          id: `WH${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          endpoints: [...state.endpoints, newEndpoint],
        }));
        return newEndpoint;
      },
      removeEndpoint: (id) => {
        set((state) => ({
          endpoints: state.endpoints.filter((e) => e.id !== id),
        }));
      },
      toggleEndpoint: (id) => {
        set((state) => ({
          endpoints: state.endpoints.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
        }));
      },
      addLog: (log) => {
        const newLog: WebhookLog = {
          ...log,
          id: `LOG${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 1000), // Keep last 1000
        }));
        return newLog;
      },
      updateLog: (id, updates) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }));
      },
      getEndpointsByTenant: (tenantId) => {
        return get().endpoints.filter((e) => e.tenantId === tenantId);
      },
      getLogsByWebhook: (webhookId) => {
        return get().logs.filter((l) => l.webhookId === webhookId);
      },
    }),
    {
      name: "ride-webhooks",
    }
  )
);
