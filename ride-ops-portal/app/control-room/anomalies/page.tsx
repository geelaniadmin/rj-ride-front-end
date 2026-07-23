'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { CheckCircle, AlertCircle } from 'lucide-react';

type SosEvent = components['schemas']['SosEvent'];

export default function AnomaliesPage() {
  const language = useLanguageStore((s) => s.language);

  const { data: sosEvents = [], isLoading } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 30_000,
  });

  const active = sosEvents.filter((e) => !e.resolvedAt);
  const resolved = sosEvents.filter((e) => !!e.resolvedAt);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('anomalyAlerts', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Safety events from the API</p>
      </div>

      <AlertBanner type="info" message="Anomaly events (route deviation, prolonged stop, no-show) are detected server-side and surface here when available via the safety API." />

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl p-4 border ${active.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E0E0E0]'}`}>
          <p className="text-xs text-[#8B8FA8] uppercase tracking-wider">Active</p>
          <p className={`text-3xl font-bold mt-1 ${active.length > 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>{active.length}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white border-[#E0E0E0]">
          <p className="text-xs text-[#8B8FA8] uppercase tracking-wider">Resolved</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{resolved.length}</p>
        </div>
      </div>

      {active.length === 0 && resolved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <p className="text-[#8B8FA8] text-sm">No safety events — all clear</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <Card header={`Active Events (${active.length})`}>
              <div className="space-y-3">
                {active.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#1B2A4A]">SOS Raised</p>
                        <p className="text-xs text-[#8B8FA8] font-mono">{ev.tripVehicleId}</p>
                        <p className="text-xs text-[#8B8FA8] mt-1">{new Date(ev.raisedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">ACTIVE</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {resolved.length > 0 && (
            <Card header={`Resolved Events (${resolved.length})`}>
              <div className="space-y-2">
                {resolved.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-mono text-xs text-[#8B8FA8]">{ev.tripVehicleId}</span>
                      <p className="text-xs text-[#8B8FA8] mt-0.5">
                        {new Date(ev.raisedAt).toLocaleTimeString()} → {ev.resolvedAt ? new Date(ev.resolvedAt).toLocaleTimeString() : '—'}
                      </p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
