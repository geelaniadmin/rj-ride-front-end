'use client';

import React, { useState } from 'react';
import { useSafetyAlertStore } from '@ride/shared';
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
      day: `Day ${day}`,
      incidents: dayAlerts.filter((a) => a.type !== 'SOS').length,
      sos: dayAlerts.filter((a) => a.type === 'SOS').length,
    };
  });

  const typeBreakdown = [
    { name: 'SOS', value: tenantAlerts.filter((a) => a.type === 'SOS').length },
    { name: 'Route Deviation', value: tenantAlerts.filter((a) => a.type === 'ROUTE_DEVIATION').length },
    { name: 'No-show', value: tenantAlerts.filter((a) => a.type === 'NO_SHOW').length },
    { name: 'Prolonged Stop', value: tenantAlerts.filter((a) => a.type === 'PROLONGED_STOP').length },
  ];

  const statusBreakdown = [
    { name: 'Resolved', value: tenantAlerts.filter((a) => a.status === 'RESOLVED').length },
    { name: 'Escalated', value: tenantAlerts.filter((a) => a.status === 'ESCALATED').length },
    { name: 'Active', value: tenantAlerts.filter((a) => a.status === 'ACTIVE').length },
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
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString(), sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'tripId', label: 'Trip' },
    { key: 'resolvedAt', label: 'Resolution', render: (v, row) => (v ? Math.round((new Date(v).getTime() - new Date(row.createdAt).getTime()) / 60000) + ' min' : '—') },
    { key: 'resolvedBy', label: 'Resolved by', render: (v) => v || '—' },
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
      <h1 className="text-3xl font-bold text-[#1B2A4A]">Safety Reports</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={prevMonth}>
            ← Prev
          </Button>
          <span className="font-semibold text-[#3D434A] min-w-40 text-center">{monthName}</span>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            Next →
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => addToast({ type: 'info', message: 'Preparing safety report CSV...', duration: 3000 })}>
          📥 Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total SOS" value={sosAlerts.length} icon={<AlertCircle />} />
        <KpiCard label="Avg resolution" value={avgResolutionTime} unit="min" icon={<TrendingUp />} />
        <KpiCard label="Route deviations" value={tenantAlerts.filter((a) => a.type === 'ROUTE_DEVIATION').length} icon={<BarChart3 />} />
        <KpiCard label="On-time %" value="94" unit="%" icon={<TrendingUp />} trend={{ direction: 'up', value: '2% from last month' }} />
      </div>

      <Card header="Daily incidents">
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
        <Card header="Breakdown by type">
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

        <Card header="Resolution status">
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

      <Card header="Incidents">
        <DataTable columns={reportColumns} data={tenantAlerts} rowKey="id" pageSize={5} />
      </Card>
    </div>
  );
}
