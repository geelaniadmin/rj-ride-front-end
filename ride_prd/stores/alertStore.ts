'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Alert {
  id: string;
  tenantId?: string;
  vendorId?: string;
  type: string;
  severity?: string;
  message?: string;
  read?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

interface AppNotification {
  id: string;
  vendorId?: string;
  message?: string;
  read?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

interface AlertStore {
  alerts: Alert[];
  notifications: AppNotification[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt'>) => void;
  markAlertRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  getAlertsForVendor: (vendorId: string) => Alert[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (vendorId: string) => void;
  getNotificationsForVendor: (vendorId: string) => AppNotification[];
  getUnreadCount: (vendorId: string) => number;
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      notifications: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) => {
        const entry = { ...alert, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Alert;
        set((state) => ({ alerts: [...state.alerts, entry] }));
      },
      markAlertRead: (id) => {
        set((state) => ({ alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }));
      },
      dismissAlert: (id) => {
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
      },
      getAlertsForVendor: (vendorId) => get().alerts.filter((a) => a.vendorId === vendorId),
      addNotification: (notif) => {
        const entry: AppNotification = { ...notif, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ notifications: [entry, ...state.notifications].slice(0, 100) }));
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },
      markAllNotificationsRead: (vendorId) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.vendorId === vendorId ? { ...n, read: true } : n)),
        }));
      },
      getNotificationsForVendor: (vendorId) => get().notifications.filter((n) => n.vendorId === vendorId),
      getUnreadCount: (vendorId) => get().notifications.filter((n) => n.vendorId === vendorId && !n.read).length,
    }),
    { name: 'ride-alerts' }
  )
);
