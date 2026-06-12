'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType =
  | 'SOS_RAISED'
  | 'SOS_RESOLVED'
  | 'ANOMALY_DETECTED'
  | 'TRIP_COMPLETED'
  | 'RATE_CARD_EXPIRING'
  | 'RATE_CARD_PUBLISHED'
  | 'TENANT_PAYMENT_DUE'
  | 'SYSTEM_ALERT'
  | 'TENANT_ONBOARDED';

export type NotificationSeverity = 'red' | 'amber' | 'green';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  role: 'control-room' | 'rate-manager' | 'super-admin';
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (role: string) => void;
  deleteNotification: (id: string) => void;
  getUnreadCount: (role: string) => number;
  getNotificationsByRole: (role: string) => Notification[];
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) => {
        set((state) => ({
          notifications: [
            { ...notification, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
            ...state.notifications,
          ],
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        }));
      },

      markAllAsRead: (role) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.role === role ? { ...n, isRead: true } : n)),
        }));
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      getUnreadCount: (role) => {
        return get().notifications.filter((n) => n.role === role && !n.isRead).length;
      },

      getNotificationsByRole: (role) => {
        return get().notifications.filter((n) => n.role === role).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
    }),
    { name: 'ride-ops-notifications' }
  )
);

export function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
