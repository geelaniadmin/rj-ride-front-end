'use client';

import React, { useState, useMemo } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { useRouter } from 'next/navigation';
import { roleColors, roleDisplayNames } from '@/lib/types';
import { Badge } from '../ui/Badge';

interface OpsHeaderProps {
  onMenuClick?: () => void;
}

export function OpsHeader({ onMenuClick }: OpsHeaderProps) {
  const { session, clearSession, setSession } = useOpsSessionStore();
  const router = useRouter();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const allNotifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useMemo(
    () => (session ? allNotifications.filter((n) => n.role === session.role && !n.isRead).length : 0),
    [allNotifications, session?.role]
  );

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const handleRoleSwitch = (role: 'control-room' | 'rate-manager' | 'super-admin') => {
    if (session) {
      setSession({ ...session, role });
      router.push(`/${role === 'control-room' ? 'control-room' : role === 'rate-manager' ? 'rate-manager' : 'super-admin'}`);
      setRoleMenuOpen(false);
    }
  };

  if (!session) return null;

  const color = roleColors[session.role];
  const displayName = roleDisplayNames[session.role];

  return (
    <header className="h-16 bg-card-bg border-b border-border flex items-center justify-between px-4 lg:px-6 z-20">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-ops-bg rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-sm">
            R
          </div>
          <Badge variant="blue" className={color.badge}>
            {displayName}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setNotificationDrawerOpen(true)}
            className="relative p-2 hover:bg-ops-bg rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-xs font-bold"
          >
            {session.name.charAt(0).toUpperCase()}
          </button>
          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card-bg border border-border rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => handleRoleSwitch('control-room')}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-ops-bg"
              >
                Switch to Control Room
              </button>
              <button
                onClick={() => handleRoleSwitch('rate-manager')}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-ops-bg"
              >
                Switch to Rate Manager
              </button>
              <button
                onClick={() => handleRoleSwitch('super-admin')}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-ops-bg"
              >
                Switch to Super Admin
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-ops-bg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {session && (
        <NotificationDrawer
          isOpen={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          role={session.role}
        />
      )}
    </header>
  );
}
