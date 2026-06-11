'use client';

import React, { useState } from 'react';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { OpsHeader } from './OpsHeader';
import { ControlRoomSidebar, RateManagerSidebar, SuperAdminSidebar } from './Sidebars';

interface OpsShellProps {
  children: React.ReactNode;
}

export function OpsShell({ children }: OpsShellProps) {
  const { session } = useOpsSessionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!session) return <>{children}</>;

  const SidebarComponent =
    session.role === 'control-room'
      ? ControlRoomSidebar
      : session.role === 'rate-manager'
        ? RateManagerSidebar
        : SuperAdminSidebar;

  return (
    <div className="flex h-screen bg-[#F4F5F7]">
      <div className="hidden md:flex">
        <SidebarComponent />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <SidebarComponent />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <OpsHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto mt-16 p-6">{children}</main>
      </div>
    </div>
  );
}
