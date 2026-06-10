import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VendorAlert, Notification } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

interface AlertStore {
  alerts: VendorAlert[];
  notifications: Notification[];
  setAlerts: (alerts: VendorAlert[]) => void;
  addAlert: (alert: Omit<VendorAlert, 'id' | 'createdAt'>) => void;
  markAlertRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  getAlertsForVendor: (vendorId: string) => VendorAlert[];
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (vendorId: string) => void;
  getNotificationsForVendor: (vendorId: string) => Notification[];
  getUnreadCount: (vendorId: string) => number;
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      notifications: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) => {
        set((state) => ({
          alerts: [...state.alerts, { ...alert, id: generateId(), createdAt: new Date().toISOString() }],
        }));
      },
      markAlertRead: (id) => {
        set((state) => ({ alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }));
      },
      dismissAlert: (id) => {
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
      },
      getAlertsForVendor: (vendorId) => get().alerts.filter((a) => a.vendorId === vendorId),
      addNotification: (notif) => {
        const entry: Notification = { ...notif, id: generateId(), createdAt: new Date().toISOString() };
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
    { name: 'ride-vendor-alerts' }
  )
);
