'use client';

import React, { useMemo } from 'react';
import { useTenantStore } from '@/stores/tenantStore';
import { useTripStore } from '@/stores/tripStore';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { KpiCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Zap } from 'lucide-react';

export default function BillingPage() {
  const tenants = useTenantStore((s) => s.tenants);
  const trips = useTripStore((s) => s.trips);

  const isLoading = trips.length === 0;

  const billingStats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'BILLED');
    const totalRevenue = completed.reduce((sum, t) => {
      const avgPrice = t.vehicles.reduce((sum2, v) => sum2 + (v.lockedPrice || 0), 0) / (t.vehicles.length || 1);
      return sum + avgPrice;
    }, 0);

    const tenantRevenue = tenants.map((tenant) => ({
      name: tenant.name,
      revenue: completed
        .filter((t) => t.tenantId === tenant.id)
        .reduce((sum, t) => {
          const avgPrice = t.vehicles.reduce((sum2, v) => sum2 + (v.lockedPrice || 0), 0) / (t.vehicles.length || 1);
          return sum + avgPrice;
        }, 0),
      trips: completed.filter((t) => t.tenantId === tenant.id).length,
    }));

    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0] || '';
      const dayTrips = completed.filter((t) => t.createdAt?.startsWith(dateStr)).length;
      const dayRevenue =
        completed
          .filter((t) => t.createdAt?.startsWith(dateStr))
          .reduce((sum, t) => {
            const avgPrice = t.vehicles.reduce((sum2, v) => sum2 + (v.lockedPrice || 0), 0) / (t.vehicles.length || 1);
            return sum + avgPrice;
          }, 0) / 100;

      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(dayRevenue),
        trips: dayTrips,
      };
    });

    return { totalRevenue, tenantRevenue, dailyData, completedTrips: completed.length };
  }, [trips, tenants]);

  const avgRevenuePerTrip = billingStats.completedTrips > 0 ? billingStats.totalRevenue / billingStats.completedTrips / 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Billing Dashboard</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Revenue and trip analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Total revenue" value={`₹${(billingStats.totalRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<DollarSign />} />
            <KpiCard label="Completed trips" value={billingStats.completedTrips} icon={<Zap />} />
            <KpiCard label="Avg revenue/trip" value={`₹${avgRevenuePerTrip.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<TrendingUp />} />
            <KpiCard label="Active tenants" value={tenants.length} icon={<TrendingUp />} />
          </>
        )}
      </div>

      <Card header="Daily revenue (Last 7 days)">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={billingStats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => `₹${value}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#2563EB" name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card header="Revenue by tenant">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={billingStats.tenantRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value: any) => `₹${(value / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue (₹)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card header="Tenant billing summary">
        <div className="space-y-3">
          {billingStats.tenantRevenue.map((item) => (
            <div key={item.name} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-[#1B2A4A]">{item.name}</p>
                <p className="text-xs text-[#8B8FA8]">{item.trips} completed trips</p>
              </div>
              <p className="font-bold text-[#2563EB]">₹{(item.revenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
