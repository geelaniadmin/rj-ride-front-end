'use client';

import React, { useState } from 'react';
import { useLanguageStore, t, useSession, useAuth } from '@/lib/shared';
import { Bell, LogOut, Menu } from 'lucide-react';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { useRouter } from 'next/navigation';
import { LanguageToggle } from '../ui/LanguageToggle';

interface OpsHeaderProps {
  onMenuClick?: () => void;
}

export function OpsHeader({ onMenuClick }: OpsHeaderProps) {
  const language = useLanguageStore((s) => s.language);
  const { user } = useSession();
  const { logout } = useAuth();
  const router = useRouter();
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-card-bg border-b border-border flex items-center justify-between px-4 lg:px-6 z-20 fixed top-0 right-0 left-0 md:left-60">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-ops-bg rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-sm">
            R
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-2 hover:bg-ops-bg rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5 text-text-secondary" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-xs font-bold"
          >
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card-bg border border-border rounded-lg shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-medium text-text-primary truncate">{user.name ?? user.email}</p>
                <p className="text-xs text-text-muted">{user.role}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); void handleLogout(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-ops-bg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> {t('logout', language)}
              </button>
            </div>
          )}
        </div>
      </div>

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
    </header>
  );
}
