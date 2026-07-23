'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

type SosEvent = components['schemas']['SosEvent'];

export default function ReportsPage() {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());

  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);

  const { data: sosEvents = [] } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 60_000,
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyData = Array.from({ length: Math.min(daysInMonth, 15) }, (_, i) => {
    const day = i + 1;
    const dayStart = new Date(year, month, day);
    const dayEnd = new Date(year, month, day + 1);
    const daySos = sosEvents.filter((e) => {
      const d = new Date(e.raisedAt);
      return d >= dayStart && d < dayEnd;
    }).length;
    return { day: `Day ${day}`, sos: daySos };
  });

  const activeSos = sosEvents.filter((e) => !e.resolvedAt).length;
  const resolvedSos = sosEvents.filter((e) => !!e.resolvedAt).length;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('safetyReports', language)}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={prevMonth}>← {t('prev', language)}</Button>
          <span className="font-semibold text-[#3D434A] min-w-40 text-center">{monthName}</span>
          <Button variant="secondary" size="sm" onClick={nextMonth}>{t('next', language)} →</Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => addToast({ type: 'info', message: t('preparingCSV', language), duration: 3000 })}>
          {t('exportCSV', language)}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label={t('totalSOS', language)} value={sosEvents.length} icon={<AlertCircle />} />
        <KpiCard label="Active SOS" value={activeSos} icon={<BarChart3 />} />
        <KpiCard label="Resolved SOS" value={resolvedSos} icon={<TrendingUp />} />
      </div>

      <Card header={t('dailyIncidents', language)}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sos" stroke="#E84040" name="SOS" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
