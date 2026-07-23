'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient, useLanguageStore, t } from '@/lib/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface SimulateResult {
  total?: number;
  breakdown?: Record<string, number>;
  [key: string]: unknown;
}

export default function SimulatePage() {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);

  const [distanceKm, setDistanceKm] = useState('25');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [waitingMinutes, setWaitingMinutes] = useState('0');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [tripTime, setTripTime] = useState('14:00');
  const [result, setResult] = useState<SimulateResult | null>(null);

  const [hourStr] = tripTime.split(':');
  const hour = Number(hourStr);
  const isNight = hour >= 22 || hour < 6;

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const { data: res, error: err } = await apiClient.POST('/v1/config/pricing/simulate', {
        body: {
          distanceKm: Number(distanceKm),
          durationMinutes: Number(durationMinutes),
          waitingMinutes: Number(waitingMinutes),
          tripDateTime: `${tripDate}T${tripTime}:00`,
        } as never,
      });
      if (err) throw err;
      return res?.result as SimulateResult;
    },
    onSuccess: (data) => {
      setResult(data ?? null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Simulation failed — check API', duration: 3000 });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('fareSimulator', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('testValidateRateCards', language)}</p>
      </div>

      <AlertBanner type="info" message="Simulation uses the server-side pricing engine against active rate cards. Zero PII is sent." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={t('inputs', language)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Waiting time (minutes)</label>
              <input
                type="number"
                min="0"
                value={waitingMinutes}
                onChange={(e) => setWaitingMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Trip date & time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
                <input
                  type="time"
                  value={tripTime}
                  onChange={(e) => setTripTime(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
              {isNight && <p className="text-xs text-orange-600 mt-1">{t('nightTripDetected', language)}</p>}
            </div>

            <Button onClick={() => simulateMutation.mutate()} disabled={simulateMutation.isPending} className="w-full">
              {simulateMutation.isPending ? 'Simulating…' : 'Run Simulation'}
            </Button>
          </div>
        </Card>

        <div>
          {result ? (
            <Card header="Simulated fare">
              <div className="space-y-3">
                {result.breakdown && Object.entries(result.breakdown).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-[#8B8FA8] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium">₹{(Number(val) / 100).toFixed(2)}</span>
                  </div>
                ))}
                {result.total !== undefined && (
                  <div className="flex justify-between text-2xl font-bold border-t pt-3">
                    <span>{t('total', language)}</span>
                    <span className="text-[#2563EB]">₹{(result.total / 100).toFixed(2)}</span>
                  </div>
                )}
                <p className="text-xs text-[#8B8FA8] italic pt-2 border-t">{t('simulationDisclaimer', language)}</p>
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 rounded-xl border border-[#E0E0E0]">
              <p className="text-sm text-[#8B8FA8]">Run a simulation to see the fare breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
