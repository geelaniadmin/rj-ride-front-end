'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { LayoutList, Plus, TrendingUp } from 'lucide-react';

type RateCard = components['schemas']['RateCard'];

export default function RateManagerPage() {
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<RateCard | null>(null);

  const { data: rateCards = [], isLoading } = useQuery({
    queryKey: keys.config.rateCards.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/config/pricing/rate-cards');
      if (err) throw err;
      return ((res as unknown as { results?: RateCard[] })?.results ?? []) as RateCard[];
    },
    staleTime: 60_000,
  });

  const columns: Column<RateCard>[] = [
    {
      key: 'id',
      label: t('id', language),
      sortable: true,
      render: (v) => <span className="font-mono text-xs">{String(v).substring(0, 8)}…</span>,
    },
    { key: 'name', label: t('name', language), sortable: true },
    {
      key: 'version',
      label: t('version', language),
      render: (v) => `v${v ?? 1}`,
    },
    {
      key: 'id',
      label: t('actions', language),
      render: (_v, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCard(row)}
            className="text-[#2563EB] hover:underline text-sm font-medium"
          >
            {t('view', language)}
          </button>
          <button
            onClick={() => router.push(`/rate-manager/create?from=${row.id}`)}
            className="text-[#2563EB] hover:underline text-sm font-medium"
          >
            {t('newVersion', language)}
          </button>
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('rateCards', language)}</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">{t('preNegotiatedRates', language)}</p>
        </div>
        <Button onClick={() => router.push('/rate-manager/create')}>
          <Plus className="w-4 h-4 mr-2 inline" /> {t('newRateCard', language)}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label={t('activeCards', language)} value={rateCards.length} icon={<LayoutList />} />
        <KpiCard label="Total versions" value={rateCards.reduce((s, r) => s + (r.version ?? 1), 0)} icon={<TrendingUp />} />
        <KpiCard label="Rate cards" value={rateCards.length} icon={<LayoutList />} />
      </div>

      <Card header={`${t('rateCards', language)} (${rateCards.length})`}>
        <DataTable columns={columns} data={rateCards} rowKey="id" pageSize={20} />
      </Card>

      <Drawer isOpen={!!selectedCard} onClose={() => setSelectedCard(null)} title={selectedCard?.name} side="right">
        {selectedCard && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">ID</p>
              <p className="font-mono text-sm text-[#1B2A4A]">{selectedCard.id}</p>
            </div>
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">{t('name', language)}</p>
              <p className="text-sm font-medium text-[#1B2A4A]">{selectedCard.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">{t('version', language)}</p>
              <Badge className="font-mono">v{selectedCard.version ?? 1}</Badge>
            </div>
            <div className="border-t pt-4">
              <Button onClick={() => { setSelectedCard(null); router.push(`/rate-manager/create?from=${selectedCard.id}`); }}>
                {t('createNewVersion', language)}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
