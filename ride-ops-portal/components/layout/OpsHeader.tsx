'use client';

import React, { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { useRouter } from 'next/navigation';
import { roleColors, roleDisplayNames } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { useTripStore, useAlertStore } from '@ride/shared';

interface OpsHeaderProps {
  onMenuClick?: () => void;
}

export function OpsHeader({ onMenuClick }: OpsHeaderProps) {
  const { session, clearSession, setSession } = useOpsSessionStore();
  const router = useRouter();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const alerts = useAlertStore((s) => s.alerts);
  const alertCount = alerts.length;
  const unreadCount = useNotificationStore((s) => (session ? s.getUnreadCount(session.role) : 0));

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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E0E0E0] flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-[#3D434A] hover:bg-gray-100 p-2 rounded">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
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
            className="relative p-2 text-[#8B8FA8] hover:text-[#3D434A] hover:bg-gray-100 rounded transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold"
          >
            {session.name.charAt(0).toUpperCase()}
          </button>
          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E0E0E0] rounded-lg shadow-lg z-50">
              <button
                onClick={() => handleRoleSwitch('control-room')}
                className="w-full text-left px-4 py-2 text-sm text-[#3D434A] hover:bg-gray-50"
              >
                Switch to Control Room
              </button>
              <button
                onClick={() => handleRoleSwitch('rate-manager')}
                className="w-full text-left px-4 py-2 text-sm text-[#3D434A] hover:bg-gray-50"
              >
                Switch to Rate Manager
              </button>
              <button
                onClick={() => handleRoleSwitch('super-admin')}
                className="w-full text-left px-4 py-2 text-sm text-[#3D434A] hover:bg-gray-50"
              >
                Switch to Super Admin
              </button>
              <div className="border-t border-[#E0E0E0]" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
