'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { Activity, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

type Trip = components['schemas']['Trip'];
type SosEvent = components['schemas']['SosEvent'];

export default function HealthPage() {
  const language = useLanguageStore((s) => s.language);

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/trips');
      if (err) throw err;
      return ((res as unknown as { results?: Trip[] })?.results ?? []) as Trip[];
    },
    staleTime: 60_000,
  });

  const { data: sosEvents = [], isLoading: sosLoading } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 30_000,
  });

  const health = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
    const cancelled = trips.filter((t) => t.status === 'CANCELLED').length;
    const inProgress = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const activeSos = sosEvents.filter((e) => !e.resolvedAt).length;
    const resolvedSos = sosEvents.filter((e) => !!e.resolvedAt).length;

    return { total, completed, cancelled, inProgress, completionRate, activeSos, resolvedSos };
  }, [trips, sosEvents]);

  const isLoading = tripsLoading || sosLoading;

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
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('systemHealth', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Real-time trip and safety metrics for your tenant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label={t('completionRate', language)}
          value={`${health.completionRate}%`}
          icon={<CheckCircle />}
        />
        <KpiCard label={t('completedTrips', language)} value={health.completed} icon={<Activity />} />
        <KpiCard label={t('avgResolutionTime', language)} value={`${health.inProgress} active`} icon={<TrendingDown />} />
        <KpiCard
          label={t('activeSOSAlerts', language)}
          value={health.activeSos}
          icon={<AlertCircle />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card header={t('tripStatusBreakdown', language)}>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">{t('statusCompleted', language)}</span>
              <span className="font-bold text-green-600">{health.completed}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">{t('inProgress', language)}</span>
              <span className="font-bold text-blue-600">{health.inProgress}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span className="font-medium">{t('statusCancelled', language)}</span>
              <span className="font-bold text-orange-600">{health.cancelled}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">{t('total', language)}</span>
              <span className="font-bold">{health.total}</span>
            </div>
          </div>
        </Card>

        <Card header={t('safetyMetrics', language)}>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="font-medium">{t('activeSOS', language)}</span>
              <Badge variant={health.activeSos > 0 ? 'red' : 'green'} className="font-bold">
                {health.activeSos}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">Resolved SOS</span>
              <Badge variant="green" className="font-bold">{health.resolvedSos}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">{t('status', language)}</span>
              <Badge variant="green">{t('operational', language)}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
