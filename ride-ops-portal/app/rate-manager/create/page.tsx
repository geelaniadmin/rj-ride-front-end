'use client';

import { Suspense } from 'react';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import { useToastStore } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function CreateVersionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get('from');
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (fromId) {
        const res = await fetch(`/api/v1/config/pricing/rate-cards/${fromId}/supersede`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to supersede rate card');
      } else {
        const { error: err } = await apiClient.POST('/v1/config/pricing/rate-cards', {
          body: { name } as never,
        });
        if (err) throw err;
      }
    },
    onSuccess: () => {
      addToast({ type: 'success', message: t('rateCardSaved', language), duration: 3000 });
      void qc.invalidateQueries({ queryKey: keys.config.rateCards.list({}) });
      router.push('/rate-manager');
    },
    onError: () => {
      addToast({ type: 'error', message: t('failedToSaveRateCard', language), duration: 3000 });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      addToast({ type: 'error', message: 'Name is required', duration: 3000 });
      return;
    }
    setLoading(true);
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">
          {fromId ? t('createNewVersion', language) : t('createRateCard', language)}
        </h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('definePricingModifiers', language)}</p>
      </div>

      <Card header={t('rateCards', language)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard SUV Rate"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>
          {fromId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              Creating a new version superseding rate card <span className="font-mono">{fromId.substring(0, 8)}…</span>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => router.back()}>
          {t('cancel', language)}
        </Button>
        <Button onClick={handleSave} disabled={loading || createMutation.isPending}>
          {createMutation.isPending ? t('saving', language) : t('saveRateCard', language)}
        </Button>
      </div>
    </div>
  );
}

export default function CreateVersionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading…</div>}>
      <CreateVersionPageContent />
    </Suspense>
  );
}
