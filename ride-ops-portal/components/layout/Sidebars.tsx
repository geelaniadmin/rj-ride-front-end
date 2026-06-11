'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Zap, Layout, AlertCircle, BarChart3, Settings, DollarSign, Users, HeartHandshake, CheckCircle, LayoutList, PlusCircle, History, Calculator, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSafetyAlertStore } from '@ride/shared';
import { Badge } from '../ui/Badge';

export interface NavItem {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}

function NavLink({ href, icon: Icon, label, badge }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-target md:touch-auto ${
        isActive
          ? 'bg-white/10 border-l-2 border-[#2563EB] text-white'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
      {badge && badge > 0 && (
        <Badge variant="red" className="ml-auto text-xs px-2">{badge}</Badge>
      )}
    </Link>
  );
}

export function ControlRoomSidebar() {
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const activeSosCount = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE').length;

  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">Control Room</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/control-room" icon={Layout} label="Overview" />
        <NavLink href="/control-room/sos" icon={AlertCircle} label="Live SOS" badge={activeSosCount} />
        <NavLink href="/control-room/anomalies" icon={Zap} label="Anomalies" />
        <NavLink href="/control-room/trips" icon={Zap} label="Trips" />
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
        <NavLink href="/rate-manager" icon={LayoutList} label="Rate Cards" />
        <NavLink href="/rate-manager/create" icon={PlusCircle} label="Create" />
        <NavLink href="/rate-manager/history" icon={History} label="History" />
        <NavLink href="/rate-manager/simulate" icon={Calculator} label="Simulator" />
        <NavLink href="/rate-manager/audit" icon={FileText} label="Audit" />
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

export function getControlRoomNavItems(activeSosCount: number): NavItem[] {
  return [
    { href: '/control-room', icon: Layout, label: 'Overview' },
    { href: '/control-room/sos', icon: AlertCircle, label: 'Live SOS', badge: activeSosCount },
    { href: '/control-room/anomalies', icon: Zap, label: 'Anomalies' },
    { href: '/control-room/trips', icon: Zap, label: 'Trips' },
    { href: '/control-room/reports', icon: BarChart3, label: 'Reports' },
  ];
}

export function getRateManagerNavItems(): NavItem[] {
  return [
    { href: '/rate-manager', icon: LayoutList, label: 'Rate Cards' },
    { href: '/rate-manager/create', icon: PlusCircle, label: 'Create' },
    { href: '/rate-manager/history', icon: History, label: 'History' },
    { href: '/rate-manager/simulate', icon: Calculator, label: 'Simulator' },
    { href: '/rate-manager/audit', icon: FileText, label: 'Audit' },
  ];
}

export function getSuperAdminNavItems(): NavItem[] {
  return [
    { href: '/super-admin', icon: Layout, label: 'Dashboard' },
    { href: '/super-admin/tenants', icon: Users, label: 'Tenants' },
    { href: '/super-admin/billing', icon: DollarSign, label: 'Billing' },
    { href: '/super-admin/health', icon: HeartHandshake, label: 'System Health' },
    { href: '/super-admin/audit', icon: Settings, label: 'Audit Log' },
  ];
}
