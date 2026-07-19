'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import type { TripStatus } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Trip = components['schemas']['Trip'];

export default function TripsPage() {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const language = useLanguageStore((s) => s.language);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/trips');
      if (err) throw err;
      return ((res as unknown as { results?: Trip[] })?.results ?? []) as Trip[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const columns: Column<Trip>[] = [
    {
      key: 'id',
      label: t('tripId', language),
      sortable: true,
      render: (v) => <span className="font-mono text-xs">{String(v).substring(0, 8)}…</span>,
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
      render: (v) => (v ? new Date(String(v)).toLocaleString() : '—'),
    },
    {
      key: 'id',
      label: t('action', language),
      render: (_v, row) => (
        <button
          onClick={() => setSelectedTrip(row)}
          className="text-[#2563EB] hover:text-blue-700 text-sm font-medium"
        >
          {t('view', language)}
        </button>
      ),
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
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('allTripsReadOnly', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Live trip list — read-only view</p>
      </div>

      <AlertBanner type="info" message={t('readOnlyContactDispatcher', language)} />

      <Card header={`Trips (${trips.length})`}>
        <DataTable columns={columns} data={trips} rowKey="id" />
      </Card>

      <Drawer
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title={selectedTrip?.id}
        side="right"
      >
        {selectedTrip && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">{t('status', language)}</p>
              <StatusBadge status={selectedTrip.status as TripStatus} />
            </div>
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">{t('created', language)}</p>
              <p className="text-sm text-[#3D434A]">
                {selectedTrip.createdAt ? new Date(selectedTrip.createdAt).toLocaleString() : '—'}
              </p>
            </div>
            {selectedTrip.customerId && (
              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Customer ID</p>
                <p className="font-mono text-sm text-[#3D434A]">{selectedTrip.customerId}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
