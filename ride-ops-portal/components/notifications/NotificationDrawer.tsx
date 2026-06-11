'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationStore, getTimeAgo } from '@/stores/notificationStore';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X, AlertCircle, CheckCircle, Zap, DollarSign, Building2 } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'control-room' | 'rate-manager' | 'super-admin';
}

const iconMap = {
  SOS_RAISED: AlertCircle,
  SOS_RESOLVED: CheckCircle,
  ANOMALY_DETECTED: Zap,
  TRIP_COMPLETED: CheckCircle,
  RATE_CARD_EXPIRING: AlertCircle,
  RATE_CARD_PUBLISHED: CheckCircle,
  TENANT_PAYMENT_DUE: AlertCircle,
  SYSTEM_ALERT: AlertCircle,
  TENANT_ONBOARDED: Building2,
};

const severityColors = {
  red: 'red',
  amber: 'amber',
  green: 'green',
};

export function NotificationDrawer({ isOpen, onClose, role }: NotificationDrawerProps) {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.getNotificationsByRole(role));
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notifications" side="right">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#E0E0E0]">
          <p className="text-sm font-semibold text-[#1B2A4A]">
            {unreadCount > 0 ? `${unreadCount} New` : 'All read'}
          </p>
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={() => markAllAsRead(role)}>
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-[#8B8FA8]">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type as keyof typeof iconMap] || AlertCircle;
              const color = severityColors[notification.severity];
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    notification.isRead
                      ? 'bg-white border-[#E0E0E0] hover:bg-gray-50'
                      : `bg-${color}-50 border-${color}-200 hover:bg-${color}-100`
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 text-${color}-600`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold text-[#1B2A4A]">{notification.title}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="flex-shrink-0 text-[#8B8FA8] hover:text-[#1B2A4A]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#8B8FA8] mt-1">{notification.message}</p>
                      <p className="text-xs text-[#8B8FA8] mt-1">{getTimeAgo(notification.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
