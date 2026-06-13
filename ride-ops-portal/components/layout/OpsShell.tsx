'use client';

import React, { useState, useMemo } from 'react';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { useSafetyAlertStore } from '@ride/shared';
import { OpsHeader } from './OpsHeader';
import { ControlRoomSidebar, RateManagerSidebar, SuperAdminSidebar, getControlRoomNavItems, getRateManagerNavItems, getSuperAdminNavItems } from './Sidebars';
import { MobileMenu } from './MobileMenu';

interface OpsShellProps {
  children: React.ReactNode;
}

export function OpsShell({ children }: OpsShellProps) {
  const { session } = useOpsSessionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);

  // All hooks MUST be declared before any early return to avoid
  // "Rendered more hooks than during the previous render" errors
  const navItems = useMemo(() => {
    if (!session) return [];
    if (session.role === 'control-room') {
      const activeSosCount = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE').length;
      return getControlRoomNavItems(activeSosCount);
    } else if (session.role === 'rate-manager') {
      return getRateManagerNavItems();
    } else {
      return getSuperAdminNavItems();
    }
  }, [session, safetyAlerts]);

  if (!session) return <>{children}</>;

  const SidebarComponent =
    session.role === 'control-room'
      ? ControlRoomSidebar
      : session.role === 'rate-manager'
        ? RateManagerSidebar
        : SuperAdminSidebar;

  const menuTitle =
    session.role === 'control-room'
      ? 'Control Room'
      : session.role === 'rate-manager'
        ? 'Rate Manager'
        : 'Super Admin';

  return (
    <div className="flex h-screen bg-[#F4F5F7]">
      <div className="hidden md:flex">
        <SidebarComponent />
      </div>

      <MobileMenu isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} title={menuTitle} items={navItems} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <OpsHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto mt-16 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
