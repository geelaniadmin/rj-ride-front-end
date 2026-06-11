'use client';

import React from 'react';
import { Link, Layout, AlertCircle, Zap, BarChart3, Settings, DollarSign, Users, HeartHandshake, CheckCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<any>; label: string }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-white/10 border-l-2 border-[#2563EB] text-white'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}

export function ControlRoomSidebar() {
  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">Control Room</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/control-room" icon={Layout} label="Overview" />
        <NavLink href="/control-room/sos" icon={AlertCircle} label="Live SOS" />
        <NavLink href="/control-room/anomalies" icon={Zap} label="Anomalies" />
        <NavLink href="/control-room/trips" icon={Link} label="Trips" />
        <NavLink href="/control-room/reports" icon={BarChart3} label="Reports" />
      </nav>
    </aside>
  );
}

export function RateManagerSidebar() {
  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">Rate Manager</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/rate-manager" icon={DollarSign} label="Rate Cards" />
        <NavLink href="/rate-manager/create" icon={Zap} label="Create Version" />
        <NavLink href="/rate-manager/history" icon={BarChart3} label="History" />
        <NavLink href="/rate-manager/simulate" icon={CheckCircle} label="Simulator" />
        <NavLink href="/rate-manager/audit" icon={Settings} label="Audit" />
      </nav>
    </aside>
  );
}

export function SuperAdminSidebar() {
  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">Super Admin</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/super-admin" icon={Layout} label="Dashboard" />
        <NavLink href="/super-admin/tenants" icon={Users} label="Tenants" />
        <NavLink href="/super-admin/billing" icon={DollarSign} label="Billing" />
        <NavLink href="/super-admin/health" icon={HeartHandshake} label="System Health" />
        <NavLink href="/super-admin/audit" icon={Settings} label="Audit Log" />
      </nav>
    </aside>
  );
}
