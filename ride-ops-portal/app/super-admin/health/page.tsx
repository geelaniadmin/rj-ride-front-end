'use client';

import React, { useMemo } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useSafetyAlertStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

export default function HealthPage() {
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);

  const health = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED').length;
    const cancelled = trips.filter((t) => t.status === 'CANCELLED').length;
    const inProgress = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = Math.round(Math.random() * 20 + 85); // Mock: 85-95%
    const avgResolutionTime = Math.round(Math.random() * 30 + 5); // Mock: 5-35 minutes

    const activeAlerts = safetyAlerts.filter((a) => a.status === 'ACTIVE').length;
    const sosAlerts = safetyAlerts.filter((a) => a.type === 'SOS').length;

    const dailyMetrics = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        uptime: Math.round(Math.random() * 5 + 95),
        alerts: Math.floor(Math.random() * 10),
        errors: Math.floor(Math.random() * 5),
      };
    });

    return { total, completed, cancelled, inProgress, completionRate, onTimeRate, avgResolutionTime, activeAlerts, sosAlerts, dailyMetrics };
  }, [trips, safetyAlerts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">System Health</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Uptime, performance, and SLA metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Completion rate" value={`${health.completionRate}%`} icon={<CheckCircle />} trend={{ direction: 'up', value: '+2% from last week' }} />
        <KpiCard label="On-time rate" value={`${health.onTimeRate}%`} icon={<Activity />} />
        <KpiCard label="Avg resolution time" value={`${health.avgResolutionTime} min`} icon={<TrendingDown />} />
        <KpiCard label="Active SOS alerts" value={health.sosAlerts} icon={<AlertCircle />} trend={health.sosAlerts > 0 ? { direction: 'down', value: 'Attention needed' } : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card header="Trip status breakdown">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">Completed</span>
              <span className="font-bold text-green-600">{health.completed}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">In Progress</span>
              <span className="font-bold text-blue-600">{health.inProgress}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span className="font-medium">Cancelled</span>
              <span className="font-bold text-orange-600">{health.cancelled}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Total</span>
              <span className="font-bold">{health.total}</span>
            </div>
          </div>
        </Card>

        <Card header="Safety metrics">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="font-medium">Active SOS</span>
              <Badge variant={health.sosAlerts > 0 ? 'red' : 'green'} className="font-bold">{health.sosAlerts}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-medium">All active alerts</span>
              <Badge variant="default" className="font-bold">{health.activeAlerts}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">Status</span>
              <Badge variant="green">Operational</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card header="System uptime (Last 7 days)">
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

      <Card header="Incidents & errors">
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
