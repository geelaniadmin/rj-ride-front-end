'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import type { TripStatus } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DollarSign, TrendingUp, Zap } from 'lucide-react';

type Invoice = components['schemas']['Invoice'];

export default function BillingPage() {
  const language = useLanguageStore((s) => s.language);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: keys.billing.invoices.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/billing/invoices');
      if (err) throw err;
      return ((res as unknown as { results?: Invoice[] })?.results ?? []) as Invoice[];
    },
    staleTime: 60_000,
  });

  const totalMinor = invoices.reduce((s, inv) => s + (inv.totalMinor ?? 0), 0);
  const paid = invoices.filter((i) => i.status === 'PAID').length;
  const pending = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID').length;

  const columns: Column<Invoice>[] = [
    {
      key: 'id',
      label: 'Invoice ID',
      render: (v) => <span className="font-mono text-xs">{String(v).substring(0, 8)}…</span>,
    },
    {
      key: 'status',
      label: t('status', language),
      render: (v) => <StatusBadge status={v as TripStatus} />,
    },
    {
      key: 'totalMinor',
      label: 'Amount',
      render: (v, row) => `${row.currency ?? '₹'} ${((v as number) / 100).toFixed(2)}`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('billingDashboard', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Read-only billing oversight for your tenant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label={t('totalRevenue', language)}
          value={`₹${(totalMinor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={<DollarSign />}
        />
        <KpiCard label="Paid invoices" value={paid} icon={<Zap />} />
        <KpiCard label="Pending invoices" value={pending} icon={<TrendingUp />} />
      </div>

      <Card header={`Invoices (${invoices.length})`}>
        <DataTable columns={columns} data={invoices} rowKey="id" pageSize={20} />
      </Card>
    </div>
  );
}
