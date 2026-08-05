"use client";

import React, { useMemo } from "react";
import { X, CheckCheck, Eye, Bell, Truck, CheckCircle, AlertTriangle, FileText, User, Info } from "lucide-react";
import { useAlertStore } from "@ride/shared";

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
}

const NOTIF_ICONS: Record<string, React.ElementType> = {
  TRIP_ASSIGNED: Truck,
  TRIP_ACCEPTED: CheckCircle,
  TRIP_COMPLETED: CheckCircle,
  VEHICLE_BREAKDOWN: AlertTriangle,
  DOC_EXPIRY: FileText,
  DRIVER_OFFLINE: User,
  FAILOVER: Info,
};

const NOTIF_COLORS: Record<string, string> = {
  TRIP_ASSIGNED: "text-brand-blue bg-brand-blue/10",
  TRIP_ACCEPTED: "text-success bg-success/10",
  TRIP_COMPLETED: "text-emerald-700 bg-emerald-50",
  VEHICLE_BREAKDOWN: "text-danger bg-danger/10",
  DOC_EXPIRY: "text-warning bg-warning/10",
  DRIVER_OFFLINE: "text-text-muted bg-ops-bg",
  FAILOVER: "text-purple-600 bg-purple-50",
};

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onClose, vendorId }) => {
  const notifications = useAlertStore((s) => s.notifications);
  const markNotificationRead = useAlertStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAlertStore((s) => s.markAllNotificationsRead);

  const vendorNotifications = useMemo(
    () =>
      notifications
        .filter((n) => n.vendorId === vendorId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, vendorId]
  );

  const unreadCount = vendorNotifications.filter((n) => !n.read).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[400px] bg-card-bg shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card-bg z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-danger text-white px-1.5 py-0.5 rounded-full font-medium">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead(vendorId)}
                className="flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium px-2 py-1 hover:bg-ops-bg rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-ops-bg rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-border/50">
          {vendorNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Bell className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-sm text-text-muted">No notifications yet</p>
              <p className="text-xs text-text-muted mt-1">
                Notifications appear here when trips are assigned or completed
              </p>
            </div>
          ) : (
            vendorNotifications.map((notif) => {
              const Icon = NOTIF_ICONS[notif.type] || Bell;
              const colorClass = NOTIF_COLORS[notif.type] || "text-text-muted bg-ops-bg";
              return (
                <div
                  key={notif.id}
                  className={`px-5 py-4 flex items-start gap-3 hover:bg-ops-bg/30 transition-colors cursor-pointer ${
                    !notif.read ? "bg-brand-blue/[0.02]" : ""
                  }`}
                  onClick={() => {
                    if (!notif.read) markNotificationRead(notif.id);
                    onClose();
                  }}
                >
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notif.read ? "font-semibold text-text-primary" : "text-text-primary"}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-text-muted shrink-0">{getTimeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(notif.id);
                      }}
                      className="p-1 hover:bg-ops-bg rounded-lg transition-colors shrink-0 self-center"
                      title="Mark read"
                    >
                      <Eye className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
