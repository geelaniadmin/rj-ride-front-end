"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSessionStore, useAlertStore } from "@ride/shared";
import { useFleetAlerts } from "@/hooks/useFleetAlerts";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Bell, AlertTriangle, FileText, CheckCircle, Eye, X,
  CheckCheck, Truck, User, Info
} from "lucide-react";

export default function AlertsPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const notifications = useAlertStore((s) => s.notifications);
  const markNotificationRead = useAlertStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAlertStore((s) => s.markAllNotificationsRead);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);
  const markAlertRead = useAlertStore((s) => s.markAlertRead);

  if (!vendorSession) return null;

  const vendorId = vendorSession.vendorId;
  const { computedAlerts, highCount, mediumCount, lowCount } = useFleetAlerts(vendorId);
  const [activeTab, setActiveTab] = useState("notifications");

  const vendorNotifications = useMemo(
    () => notifications.filter((n) => n.vendorId === vendorId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, vendorId]
  );

  const unreadCount = vendorNotifications.filter((n) => !n.read).length;

  const tabs: Tab[] = [
    { id: "notifications", label: "Notifications", count: unreadCount || undefined },
    { id: "alerts", label: "Fleet Alerts", count: highCount + mediumCount + lowCount || undefined },
  ];

  const handleMarkAllRead = () => {
    markAllNotificationsRead(vendorId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TRIP_ASSIGNED": return Truck;
      case "TRIP_ACCEPTED": return CheckCircle;
      case "TRIP_COMPLETED": return CheckCircle;
      case "VEHICLE_BREAKDOWN": return AlertTriangle;
      case "DOC_EXPIRY": return FileText;
      case "DRIVER_OFFLINE": return User;
      case "FAILOVER": return Info;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "TRIP_ASSIGNED": return "text-brand-blue bg-brand-blue/10";
      case "TRIP_ACCEPTED": return "text-success bg-success/10";
      case "TRIP_COMPLETED": return "text-success bg-success/10";
      case "VEHICLE_BREAKDOWN": return "text-danger bg-danger/10";
      case "DOC_EXPIRY": return "text-warning bg-warning/10";
      case "DRIVER_OFFLINE": return "text-text-muted bg-ops-bg";
      case "FAILOVER": return "text-warning bg-warning/10";
      default: return "text-text-muted bg-ops-bg";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Alerts & Notifications</h2>
          <p className="text-sm text-text-muted mt-1">
            Trip notifications and fleet compliance alerts
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === "notifications" && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          {/* Header actions */}
          {vendorNotifications.length > 0 && unreadCount > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-ops-bg/30">
              <p className="text-xs text-text-muted">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            </div>
          )}

          {vendorNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              message="You'll receive notifications here when trips are assigned, accepted, or completed."
            />
          ) : (
            <div className="divide-y divide-border/50">
              {vendorNotifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                const colorClass = getNotificationColor(notif.type);
                return (
                  <div
                    key={notif.id}
                    className={`px-5 py-4 flex items-start gap-4 hover:bg-ops-bg/30 transition-colors ${
                      !notif.read ? "bg-brand-blue/[0.02]" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read ? "font-semibold text-text-primary" : "text-text-primary"}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{notif.message}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="p-1.5 hover:bg-ops-bg rounded-lg transition-colors shrink-0"
                        title="Mark read"
                      >
                        <Eye className="w-4 h-4 text-text-muted" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== FLEET ALERTS TAB ===== */}
      {activeTab === "alerts" && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          {computedAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All Clear"
              message="No fleet compliance or operational alerts right now."
            />
          ) : (
            <div className="divide-y divide-border/50">
              {computedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-5 py-4 flex items-start gap-4 hover:bg-ops-bg/30 transition-colors ${
                    !alert.read ? "bg-brand-blue/[0.02]" : ""
                  }`}
                >
                  {/* Severity icon */}
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === "HIGH" ? (
                      <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                      </div>
                    ) : alert.severity === "MEDIUM" ? (
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-brand-blue" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase ${
                        alert.severity === "HIGH" ? "text-danger" : alert.severity === "MEDIUM" ? "text-warning" : "text-text-muted"
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-text-muted">
                        {alert.type.replace(/_/g, " ")}
                      </span>
                      {alert.daysRemaining !== undefined && (
                        <span className={`text-xs ${alert.daysRemaining < 0 ? "text-danger" : "text-text-muted"}`}>
                          · {alert.daysRemaining < 0
                            ? `${Math.abs(alert.daysRemaining)} days overdue`
                            : `${alert.daysRemaining} days remaining`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-primary">{alert.message}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!alert.read && (
                      <button
                        onClick={() => markAlertRead(alert.id)}
                        className="p-1.5 hover:bg-ops-bg rounded-lg transition-colors"
                        title="Mark read"
                      >
                        <Eye className="w-4 h-4 text-text-muted" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1.5 hover:bg-ops-bg rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4 text-text-muted hover:text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
