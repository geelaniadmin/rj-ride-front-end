'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { TripStatus } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';

type Trip = components['schemas']['Trip'];

export default function AuditPage() {
  const language = useLanguageStore((s) => s.language);
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: trips = [], isLoading } = useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/trips');
      if (err) throw err;
      return ((res as unknown as { results?: Trip[] })?.results ?? []) as Trip[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    return trips.filter((trip) => {
      if (searchId && !trip.id.toLowerCase().includes(searchId.toLowerCase())) return false;
      if (statusFilter && trip.status !== statusFilter) return false;
      return true;
    });
  }, [trips, searchId, statusFilter]);

  const statuses = Array.from(new Set(trips.map((t) => t.status))).sort();

  const columns: Column<Trip>[] = [
    {
      key: 'id',
      label: 'Trip ID',
      sortable: true,
      render: (v) => <span className="font-mono text-xs">{String(v).substring(0, 12)}…</span>,
    },
    {
      key: 'status',
      label: t('status', language),
      render: (v) => <StatusBadge status={v as TripStatus} />,
    },
    {
      key: 'createdAt',
      label: t('created', language),
      sortable: true,
      render: (v) => (v ? new Date(String(v)).toLocaleString('en-IN') : '—'),
    },
    {
      key: 'customerId',
      label: 'Customer',
      render: (v) => (v ? <span className="font-mono text-xs">{String(v).substring(0, 8)}…</span> : '—'),
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
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('auditLog', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Trip event log — per-trip lifecycle history</p>
      </div>

      <AlertBanner
        type="info"
        message="Per-trip event timeline (pghistory-backed record history) is not yet exposed via the API. This view shows the current trip list as an audit reference. Full event log will surface when the endpoint is available."
      />

      <Card header={t('filters', language)}>
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search trip ID…"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm flex-1 min-w-40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card header={`Trip log (${filtered.length})`}>
        <DataTable columns={columns} data={filtered} rowKey="id" pageSize={20} />
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <p className="text-xs text-[#1B2A4A] italic">
          {t('immutableAuditLongDesc', language)}
        </p>
      </Card>
    </div>
  );
}
