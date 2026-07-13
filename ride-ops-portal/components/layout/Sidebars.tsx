'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Zap, Layout, AlertCircle, BarChart3, Settings, DollarSign, Users, HeartHandshake, CheckCircle, LayoutList, PlusCircle, History, Calculator, FileText, MapPin } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSafetyAlertStore } from '@ride/shared';
import { Badge } from '../ui/Badge';
import { useLanguageStore } from '@/stores/languageStore';
import { t } from '@/lib/translations';

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
  const language = useLanguageStore((s) => s.language);
  const activeSosCount = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE').length;

  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">{t('controlRoom', language)}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/control-room" icon={Layout} label={t('overview', language)} />
        <NavLink href="/control-room/sos" icon={AlertCircle} label={t('liveSOS', language)} badge={activeSosCount} />
        <NavLink href="/control-room/anomalies" icon={Zap} label={t('anomalies', language)} />
        <NavLink href="/control-room/trips" icon={Zap} label={t('trips', language)} />
        <NavLink href="/control-room/reports" icon={BarChart3} label={t('reports', language)} />
      </nav>
    </aside>
  );
}

export function RateManagerSidebar() {
  const language = useLanguageStore((s) => s.language);

  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">{t('rateManager', language)}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/rate-manager" icon={LayoutList} label={t('rateCards', language)} />
        <NavLink href="/rate-manager/create" icon={PlusCircle} label={t('create', language)} />
        <NavLink href="/rate-manager/history" icon={History} label={t('history', language)} />
        <NavLink href="/rate-manager/simulate" icon={Calculator} label={t('simulator', language)} />
        <NavLink href="/rate-manager/audit" icon={FileText} label={t('audit', language)} />
      </nav>
    </aside>
  );
}

export function SuperAdminSidebar() {
  const language = useLanguageStore((s) => s.language);

  return (
    <aside className="w-60 bg-[#1B2A4A] text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold">{t('superAdmin', language)}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        <NavLink href="/super-admin" icon={Layout} label={t('dashboard', language)} />
        <NavLink href="/super-admin/tenants" icon={Users} label={t('tenants', language)} />
        <NavLink href="/super-admin/billing" icon={DollarSign} label={t('billing', language)} />
        <NavLink href="/super-admin/health" icon={HeartHandshake} label={t('systemHealth', language)} />
        <NavLink href="/super-admin/traccar" icon={MapPin} label={t('gpsTracking', language)} />
        <NavLink href="/super-admin/audit" icon={Settings} label={t('auditLog', language)} />
      </nav>
    </aside>
  );
}

export function getControlRoomNavItems(activeSosCount: number, language: 'en' | 'ja' = 'en'): NavItem[] {
  return [
    { href: '/control-room', icon: Layout, label: t('overview', language) },
    { href: '/control-room/sos', icon: AlertCircle, label: t('liveSOS', language), badge: activeSosCount },
    { href: '/control-room/anomalies', icon: Zap, label: t('anomalies', language) },
    { href: '/control-room/trips', icon: Zap, label: t('trips', language) },
    { href: '/control-room/reports', icon: BarChart3, label: t('reports', language) },
  ];
}

export function getRateManagerNavItems(language: 'en' | 'ja' = 'en'): NavItem[] {
  return [
    { href: '/rate-manager', icon: LayoutList, label: t('rateCards', language) },
    { href: '/rate-manager/create', icon: PlusCircle, label: t('create', language) },
    { href: '/rate-manager/history', icon: History, label: t('history', language) },
    { href: '/rate-manager/simulate', icon: Calculator, label: t('simulator', language) },
    { href: '/rate-manager/audit', icon: FileText, label: t('audit', language) },
  ];
}

export function getSuperAdminNavItems(language: 'en' | 'ja' = 'en'): NavItem[] {
  return [
    { href: '/super-admin', icon: Layout, label: t('dashboard', language) },
    { href: '/super-admin/tenants', icon: Users, label: t('tenants', language) },
    { href: '/super-admin/billing', icon: DollarSign, label: t('billing', language) },
    { href: '/super-admin/health', icon: HeartHandshake, label: t('systemHealth', language) },
    { href: '/super-admin/traccar', icon: MapPin, label: t('gpsTracking', language) },
    { href: '/super-admin/audit', icon: Settings, label: t('auditLog', language) },
  ];
}
