'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { TrendingUp, AlertCircle, BarChart3, DollarSign, Activity, FileText } from 'lucide-react';

type Trip = components['schemas']['Trip'];
type SosEvent = components['schemas']['SosEvent'];

export default function SuperAdminPage() {
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/trips');
      if (err) throw err;
      return ((res as unknown as { results?: Trip[] })?.results ?? []) as Trip[];
    },
    staleTime: 60_000,
  });

  const { data: sosEvents = [], isLoading: sosLoading } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 30_000,
  });

  const isLoading = tripsLoading || sosLoading;
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
  const activeSos = sosEvents.filter((e) => !e.resolvedAt).length;

  const navigationItems = [
    { title: t('billingDashboard', language), description: t('billingDashboardDesc', language), icon: DollarSign, href: '/super-admin/billing', color: 'green' },
    { title: t('systemHealth', language), description: t('systemHealthDesc', language), icon: Activity, href: '/super-admin/health', color: 'purple' },
    { title: t('auditLog', language), description: t('auditLogDesc', language), icon: FileText, href: '/super-admin/audit', color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Administration</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Tenant administration — billing, health, and audit</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /></>
        ) : (
          <>
            <KpiCard label={t('totalTrips', language)} value={trips.length} icon={<TrendingUp />} />
            <KpiCard label={t('completedTrips', language)} value={completedTrips} icon={<BarChart3 />} />
            <KpiCard label={t('activeSOS', language)} value={activeSos} icon={<AlertCircle />} trend={activeSos > 0 ? { direction: 'down', value: t('needsAttention', language) } : undefined} />
          </>
        )}
      </div>

      <Card header={t('quickNavigation', language)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.href} onClick={() => router.push(item.href)} className="p-4 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all text-left group">
                <div className="flex items-start justify-between mb-2">
                  <Icon className="w-6 h-6 text-[#2563EB]" />
                  <span className="text-xs font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100">→</span>
                </div>
                <p className="font-semibold text-[#1B2A4A] mb-1">{item.title}</p>
                <p className="text-xs text-[#8B8FA8]">{item.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card header={t('adminTools', language)}>
        <div className="space-y-3">
          <Button onClick={() => router.push('/super-admin/billing')} variant="secondary" className="w-full">{t('viewBilling', language)}</Button>
          <Button onClick={() => router.push('/super-admin/health')} variant="secondary" className="w-full">{t('systemHealth', language)}</Button>
          <Button onClick={() => router.push('/super-admin/audit')} variant="secondary" className="w-full">{t('auditLog', language)}</Button>
        </div>
      </Card>
    </div>
  );
}
