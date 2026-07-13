'use client';

import React, { useMemo } from 'react';
import { useTripStore, useLanguageStore, t } from '@ride/shared';
import { useSafetyAlertStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

export default function HealthPage() {
  const language = useLanguageStore((s) => s.language);
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);

  const health = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
    const cancelled = trips.filter((t) => t.status === 'CANCELLED').length;
    const inProgress = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    // Deterministic mock values (no Math.random - avoids hydration mismatch)
    const onTimeRate = 92;
    const avgResolutionTime = 18;

    const activeAlerts = safetyAlerts.filter((a) => a.status === 'ACTIVE').length;
    const sosAlerts = safetyAlerts.filter((a) => a.type === 'SOS').length;

    const dailyMetrics = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        // Deterministic mock values based on index — no Math.random (avoids hydration mismatch)
        uptime: [99, 98, 97, 99, 96, 98, 95][i],
        alerts: [2, 5, 1, 3, 4, 0, 2][i],
        errors: [1, 0, 2, 1, 0, 0, 1][i],
      };
    });

    return { total, completed, cancelled, inProgress, completionRate, onTimeRate, avgResolutionTime, activeAlerts, sosAlerts, dailyMetrics };
  }, [trips, safetyAlerts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('systemHealth', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('systemHealthDesc', language)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label={t('completionRate', language)} value={`${health.completionRate}%`} icon={<CheckCircle />} trend={{ direction: 'up', value: '+2% from last week' }} />
        <KpiCard label={t('onTimeRate', language)} value={`${health.onTimeRate}%`} icon={<Activity />} />
        <KpiCard label={t('avgResolutionTime', language)} value={`${health.avgResolutionTime} min`} icon={<TrendingDown />} />
        <KpiCard label={t('activeSOSAlerts', language)} value={health.sosAlerts} icon={<AlertCircle />} trend={health.sosAlerts > 0 ? { direction: 'down', value: 'Attention needed' } : undefined} />
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
              <Badge variant={health.sosAlerts > 0 ? 'red' : 'green'} className="font-bold">{health.sosAlerts}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-medium">{t('allActiveAlerts', language)}</span>
              <Badge variant="default" className="font-bold">{health.activeAlerts}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">{t('status', language)}</span>
              <Badge variant="green">{t('operational', language)}</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card header={t('systemUptime', language)}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={health.dailyMetrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[90, 100]} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="uptime" stroke="#10B981" name="Uptime %" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card header={t('incidentsAndErrors', language)}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={health.dailyMetrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="alerts" fill="#F0A030" name="Alerts" />
            <Bar dataKey="errors" fill="#E84040" name="Errors" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
