'use client';

import React, { useState } from 'react';
import { useSession } from '@/lib/shared';
import { useLanguageStore } from '@/stores/languageStore';
import { OpsHeader } from './OpsHeader';
import {
  ControlRoomSidebar,
  RateManagerSidebar,
  SuperAdminSidebar,
  getControlRoomNavItems,
  getRateManagerNavItems,
  getSuperAdminNavItems,
} from './Sidebars';
import { MobileMenu } from './MobileMenu';
import { usePathname } from 'next/navigation';

interface OpsShellProps {
  children: React.ReactNode;
}

export function OpsShell({ children }: OpsShellProps) {
  const { user } = useSession();
  const language = useLanguageStore((s) => s.language);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isControlRoom = pathname.startsWith('/control-room');
  const isRateManager = pathname.startsWith('/rate-manager');

  const SidebarComponent = isControlRoom
    ? ControlRoomSidebar
    : isRateManager
      ? RateManagerSidebar
      : SuperAdminSidebar;

  const menuTitle = isControlRoom
    ? 'Control Room'
    : isRateManager
      ? 'Rate Manager'
      : 'Administration';

  const navItems = isControlRoom
    ? getControlRoomNavItems(0, language)
    : isRateManager
      ? getRateManagerNavItems(language)
      : getSuperAdminNavItems(language);

  if (!user) return <>{children}</>;

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
