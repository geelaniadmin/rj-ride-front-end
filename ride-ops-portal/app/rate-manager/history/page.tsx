'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';

type RateCard = components['schemas']['RateCard'];

export default function HistoryPage() {
  const [selectedCard, setSelectedCard] = useState<RateCard | null>(null);
  const language = useLanguageStore((s) => s.language);

  const { data: rateCards = [], isLoading } = useQuery({
    queryKey: keys.config.rateCards.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/config/pricing/rate-cards');
      if (err) throw err;
      return ((res as unknown as { results?: RateCard[] })?.results ?? []) as RateCard[];
    },
    staleTime: 60_000,
  });

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
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('versionHistory', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('allRateCardVersions', language)}</p>
      </div>

      {rateCards.length === 0 ? (
        <Card>
          <p className="text-center text-[#8B8FA8] py-8">{t('noRateCardsMatch', language)}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rateCards.map((rc) => (
            <div key={rc.id} className="flex items-center justify-between p-4 bg-white border border-[#E0E0E0] rounded-xl">
              <div>
                <p className="font-medium text-[#1B2A4A]">{rc.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="font-mono">v{rc.version ?? 1}</Badge>
                </div>
              </div>
              <button
                onClick={() => setSelectedCard(rc)}
                className="text-[#2563EB] hover:underline text-sm font-medium"
              >
                {t('view', language)}
              </button>
            </div>
          ))}
        </div>
      )}

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
            <div className="border-t pt-4 text-xs text-[#8B8FA8]">
              {t('oldVersionsPreserved', language)}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
