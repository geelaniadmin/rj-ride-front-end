'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore } from '@/stores/tenantStore';
import { useTripStore } from '@/stores/tripStore';
import { useSafetyAlertStore } from '@ride/shared';
import { useRateCardStore } from '@/stores/rateCardStore';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { Building2, TrendingUp, AlertCircle, BarChart3, Users, DollarSign, Activity, FileText } from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const tenants = useTenantStore((s) => s.tenants);
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const rateCards = useRateCardStore((s) => s.rateCards);

  const completedTrips = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
  const activeSos = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE').length;
  const totalRevenue = trips
    .filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED')
    .reduce((sum, t) => sum + (t.vehicles[0]?.lockedPrice || 0), 0) / 100;

  const navigationItems = [
    {
      title: 'Tenant Management',
      description: 'Manage transport operators and contracts',
      icon: Building2,
      href: '/super-admin/tenants',
      color: 'blue',
    },
    {
      title: 'Billing Dashboard',
      description: 'Revenue tracking and financial metrics',
      icon: DollarSign,
      href: '/super-admin/billing',
      color: 'green',
    },
    {
      title: 'System Health',
      description: 'Uptime, performance, and SLA monitoring',
      icon: Activity,
      href: '/super-admin/health',
      color: 'purple',
    },
    {
      title: 'Audit Log',
      description: 'Immutable record of all system actions',
      icon: FileText,
      href: '/super-admin/audit',
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Super Admin Dashboard</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">System-wide operations and reporting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Active tenants" value={tenants.length} icon={<Building2 />} />
        <KpiCard label="Total trips" value={trips.length} icon={<TrendingUp />} />
        <KpiCard label="Rate cards" value={rateCards.length} icon={<BarChart3 />} />
        <KpiCard label="Active SOS" value={activeSos} icon={<AlertCircle />} trend={activeSos > 0 ? { direction: 'down', value: 'Needs attention' } : undefined} />
      </div>

      <Card header="Quick navigation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="p-4 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all text-left group"
              >
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
        <Card header="System summary">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">Completed trips</span>
              <span className="font-bold text-[#1B2A4A]">{completedTrips}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">Total revenue</span>
              <span className="font-bold text-[#1B2A4A]">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">Active alerts</span>
              <span className={`font-bold ${activeSos > 0 ? 'text-red-600' : 'text-green-600'}`}>{safetyAlerts.filter((a) => a.status === 'ACTIVE').length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm text-[#8B8FA8]">Rate card versions</span>
              <span className="font-bold text-[#1B2A4A]">{rateCards.length}</span>
            </div>
          </div>
        </Card>

        <Card header="Admin tools">
          <div className="space-y-3">
            <Button onClick={() => router.push('/super-admin/tenants')} className="w-full">
              Manage Tenants
            </Button>
            <Button onClick={() => router.push('/super-admin/billing')} variant="secondary" className="w-full">
              View Billing
            </Button>
            <Button onClick={() => router.push('/super-admin/health')} variant="secondary" className="w-full">
              System Health
            </Button>
            <Button onClick={() => router.push('/super-admin/audit')} variant="secondary" className="w-full">
              Audit Log
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
