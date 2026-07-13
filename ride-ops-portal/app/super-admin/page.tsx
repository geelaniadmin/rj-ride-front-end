'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore, t } from '@ride/shared';
import { useTenantStore } from '@ride/shared';
import { useTripStore } from '@ride/shared';
import { useSafetyAlertStore } from '@ride/shared';
import { useRateCardStore } from '@/stores/rateCardStore';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Building2, TrendingUp, AlertCircle, BarChart3, Users, DollarSign, Activity, FileText } from 'lucide-react';

export default function SuperAdminPage() {
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();
  const tenants = useTenantStore((s) => s.tenants);
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const rateCards = useRateCardStore((s) => s.rateCards);

  const isLoading = tenants.length === 0 && trips.length === 0;

  const completedTrips = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
  const activeSos = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE').length;
  const totalRevenue = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').reduce((sum, t) => sum + (t.vehicles[0]?.lockedPrice || 0), 0) / 100;

  const navigationItems = [
    { title: t('tenantManagement', language), description: t('tenantMgmtDesc', language), icon: Building2, href: '/super-admin/tenants', color: 'blue' },
    { title: t('billingDashboard', language), description: t('billingDashboardDesc', language), icon: DollarSign, href: '/super-admin/billing', color: 'green' },
    { title: t('systemHealth', language), description: t('systemHealthDesc', language), icon: Activity, href: '/super-admin/health', color: 'purple' },
    { title: t('auditLog', language), description: t('auditLogDesc', language), icon: FileText, href: '/super-admin/audit', color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('superAdminDashboard', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('superAdminDesc', language)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <KpiCard label={t('activeTenants', language)} value={tenants.length} icon={<Building2 />} />
            <KpiCard label={t('totalTrips', language)} value={trips.length} icon={<TrendingUp />} />
            <KpiCard label={t('rateCards', language)} value={rateCards.length} icon={<BarChart3 />} />
            <KpiCard label={t('activeSOS', language)} value={activeSos} icon={<AlertCircle />} trend={activeSos > 0 ? { direction: 'down', value: t('needsAttention', language) } : undefined} />
          </>
        )}
      </div>

      <Card header={t('quickNavigation', language)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.href} onClick={() => router.push(item.href)} className="p-4 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all text-left group">
                <div className="flex items-start justify-between mb-2">
                  <Icon className={`w-6 h-6 text-${item.color}-600`} />
                  <span className="text-xs font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100">→</span>
                </div>
                <p className="font-semibold text-[#1B2A4A] mb-1">{item.title}</p>
                <p className="text-xs text-[#8B8FA8]">{item.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card header={t('systemSummary', language)}>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">{t('completedTrips', language)}</span>
              <span className="font-bold text-[#1B2A4A]">{completedTrips}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">{t('totalRevenue', language)}</span>
              <span className="font-bold text-[#1B2A4A]">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">{t('activeAlerts', language)}</span>
              <span className={`font-bold ${activeSos > 0 ? 'text-red-600' : 'text-green-600'}`}>{safetyAlerts.filter((a) => a.status === 'ACTIVE').length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">{t('rateCardVersions', language)}</span>
              <span className="font-bold text-[#1B2A4A]">{rateCards.length}</span>
            </div>
          </div>
        </Card>

        <Card header={t('adminTools', language)}>
          <div className="space-y-3">
            <Button onClick={() => router.push('/super-admin/tenants')} className="w-full">{t('manageTenants', language)}</Button>
            <Button onClick={() => router.push('/super-admin/billing')} variant="secondary" className="w-full">{t('viewBilling', language)}</Button>
            <Button onClick={() => router.push('/super-admin/health')} variant="secondary" className="w-full">{t('systemHealth', language)}</Button>
            <Button onClick={() => router.push('/super-admin/audit')} variant="secondary" className="w-full">{t('auditLog', language)}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
