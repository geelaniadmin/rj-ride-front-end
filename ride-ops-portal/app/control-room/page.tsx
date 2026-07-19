'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { KpiCard } from '@/components/ui/KpiCard';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { LiveMap } from '@/components/control-room/LiveMap';
import { AlertCircle, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react';

type SosEvent = components['schemas']['SosEvent'];
type Trip = components['schemas']['Trip'];

export default function ControlRoomPage() {
  const language = useLanguageStore((s) => s.language);

  const { data: sosEvents = [], isLoading: sosLoading } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: keys.trips.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/trips', { params: { query: {} } });
      if (err) throw err;
      return (res?.result?.results ?? []) as Trip[];
    },
    staleTime: 30_000,
  });

  const isLoading = sosLoading || tripsLoading;

  const activeSos = sosEvents.filter((e) => !e.resolvedAt);
  const resolvedSos = sosEvents.filter((e) => !!e.resolvedAt);

  const activeTrips = trips.filter((t) =>
    ['ASSIGNED', 'DRIVER_ACCEPTED', 'EN_ROUTE_PICKUP', 'AT_PICKUP', 'PAX_PICKED', 'IN_TRANSIT', 'AT_DROP'].includes(t.status)
  );
  const completedToday = trips.filter((t) => {
    const today = new Date().toDateString();
    return (t.status === 'COMPLETED') && t.createdAt && new Date(t.createdAt).toDateString() === today;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('safetyBoard', language)}</h1>
        <LiveBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <KpiCard label={t('opsActiveTrips', language)} value={activeTrips.length} icon={<TrendingUp />} />
            <KpiCard
              label={t('opsSOSActive', language)}
              value={activeSos.length}
              icon={<AlertCircle />}
              trend={activeSos.length > 0 ? { direction: 'up', value: t('urgent', language) } : undefined}
            />
            <KpiCard label="Resolved Today" value={resolvedSos.length} icon={<CheckCircle />} />
            <KpiCard label="Completed Trips" value={completedToday.length} icon={<Clock />} trend={{ direction: 'up', value: t('good', language) }} />
          </>
        )}
      </div>

      {activeSos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
              <h2 className="font-bold text-red-700">Active SOS Events ({activeSos.length})</h2>
            </div>
            <Link href="/control-room/sos" className="text-sm text-red-700 font-medium hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeSos.slice(0, 3).map((ev) => (
              <div key={ev.id} className="bg-white border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs text-red-700">{ev.tripVehicleId.slice(0, 8)}…</span>
                  <p className="text-red-600 mt-0.5">Raised {new Date(ev.raisedAt).toLocaleTimeString()}</p>
                </div>
                <Link href="/control-room/sos" className="text-red-700 font-semibold text-xs border border-red-300 px-2 py-1 rounded hover:bg-red-100">
                  Respond
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card header={t('liveVehiclePositions', language)}>
        <LiveMap onMarkerClick={() => {}} />
        <p className="text-xs text-[#8B8FA8] mt-2">{t('readOnlyContactDispatcher', language)}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={`Active Trips (${activeTrips.length})`}>
          {activeTrips.length === 0 ? (
            <p className="text-[#8B8FA8] text-sm py-4 text-center">No active trips</p>
          ) : (
            <div className="space-y-2">
              {activeTrips.slice(0, 5).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                  <span className="font-mono text-xs text-[#8B8FA8]">{trip.id.slice(0, 8)}…</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{trip.status}</span>
                </div>
              ))}
              {activeTrips.length > 5 && (
                <Link href="/control-room/trips" className="block text-center text-xs text-[#2563EB] hover:underline pt-1">
                  View all {activeTrips.length} trips →
                </Link>
              )}
            </div>
          )}
        </Card>

        <Card header="Quick Navigation">
          <div className="space-y-2">
            <Link href="/control-room/sos" className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-[#1B2A4A]">SOS Board</p>
                  <p className="text-xs text-[#8B8FA8]">Manage active emergencies</p>
                </div>
              </div>
              {activeSos.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeSos.length}</span>
              )}
            </Link>
            <Link href="/control-room/anomalies" className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-semibold text-[#1B2A4A]">Anomalies</p>
                  <p className="text-xs text-[#8B8FA8]">Review anomaly events</p>
                </div>
              </div>
            </Link>
            <Link href="/control-room/trips" className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg hover:border-[#2563EB] hover:bg-blue-50 transition-all">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-[#1B2A4A]">Live Trips</p>
                  <p className="text-xs text-[#8B8FA8]">Read-only trip monitor</p>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
