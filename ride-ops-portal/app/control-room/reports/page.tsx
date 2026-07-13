'use client';

import React, { useState } from 'react';
import { useSafetyAlertStore, useLanguageStore, t } from '@ride/shared';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const language = useLanguageStore((s) => s.language);

  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const addToast = useToastStore((s) => s.addToast);

  const tenantId = 'T1';
  const tenantAlerts = safetyAlerts.filter((a) => a.tenantId === tenantId);

  // Generate month data for charts
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayStart = new Date(year, month, day);
    const dayEnd = new Date(year, month, day + 1);
    const dayAlerts = tenantAlerts.filter((a) => {
      const alertDate = new Date(a.createdAt);
      return alertDate >= dayStart && alertDate < dayEnd;
    });
    return {
      day: `${t('day', language)} ${day}`,
      incidents: dayAlerts.filter((a) => a.type !== 'SOS').length,
      sos: dayAlerts.filter((a) => a.type === 'SOS').length,
    };
  });

  const typeBreakdown = [
    { name: 'SOS', value: tenantAlerts.filter((a) => a.type === 'SOS').length },
    { name: t('routeDeviation', language), value: tenantAlerts.filter((a) => a.type === 'ROUTE_DEVIATION').length },
    { name: t('noShow', language), value: tenantAlerts.filter((a) => a.type === 'NO_SHOW').length },
    { name: t('prolongedStop', language), value: tenantAlerts.filter((a) => a.type === 'PROLONGED_STOP').length },
  ];

  const statusBreakdown = [
    { name: t('resolved', language), value: tenantAlerts.filter((a) => a.status === 'RESOLVED').length },
    { name: t('escalated', language), value: tenantAlerts.filter((a) => a.status === 'ESCALATED').length },
    { name: t('active', language), value: tenantAlerts.filter((a) => a.status === 'ACTIVE').length },
  ];

  const colors = ['#10B981', '#F97316', '#8B8FA8', '#E84040'];
  const statusColors = ['#10B981', '#F0A030', '#E84040'];

  const sosAlerts = tenantAlerts.filter((a) => a.type === 'SOS');
  const avgResolutionTime = sosAlerts.length > 0
    ? Math.round(
        sosAlerts.reduce((sum, a) => {
          if (a.resolvedAt && a.createdAt) {
            return sum + (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 60000;
          }
          return sum;
        }, 0) / sosAlerts.length
      )
    : 0;

  const reportColumns: Column<any>[] = [
    { key: 'createdAt', label: t('date', language), render: (v) => new Date(v).toLocaleDateString(), sortable: true },
    { key: 'type', label: t('type', language) },
    { key: 'tripId', label: t('trip', language) },
    { key: 'resolvedAt', label: t('resolution', language), render: (v, row) => (v ? Math.round((new Date(v).getTime() - new Date(row.createdAt).getTime()) / 60000) + ' min' : t('dash', language)) },
    { key: 'resolvedBy', label: t('resolvedBy', language), render: (v) => v || t('dash', language) },
  ];

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('safetyReports', language)}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={prevMonth}>
            ← {t('prev', language)}
          </Button>
          <span className="font-semibold text-[#3D434A] min-w-40 text-center">{monthName}</span>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            {t('next', language)} →
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => addToast({ type: 'info', message: t('preparingCSV', language), duration: 3000 })}>
          📥 {t('exportCSV', language)}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label={t('totalSOS', language)} value={sosAlerts.length} icon={<AlertCircle />} />
        <KpiCard label={t('avgResolution', language)} value={avgResolutionTime} unit="min" icon={<TrendingUp />} />
        <KpiCard label={t('routeDeviationsLabel', language)} value={tenantAlerts.filter((a) => a.type === 'ROUTE_DEVIATION').length} icon={<BarChart3 />} />
        <KpiCard label={t('onTimePct', language)} value="94" unit="%" icon={<TrendingUp />} trend={{ direction: 'up', value: '2% from last month' }} />
      </div>

      <Card header={t('dailyIncidents', language)}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="incidents" stroke="#F0A030" name="Anomalies" />
            <Line type="monotone" dataKey="sos" stroke="#E84040" name="SOS" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={t('breakdownByType', language)}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card header={t('resolutionStatus', language)}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {statusBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card header={t('incidents', language)}>
        <DataTable columns={reportColumns} data={tenantAlerts} rowKey="id" pageSize={5} />
      </Card>
    </div>
  );
}
