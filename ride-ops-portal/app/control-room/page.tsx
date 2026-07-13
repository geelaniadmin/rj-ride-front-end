'use client';

import React, { useState } from 'react';
import { useLanguageStore, t } from '@ride/shared';
import { useTripStore, useSafetyAlertStore } from '@ride/shared';
import { useTraccarStore } from '@ride/shared';
import { useTenantStore } from '@ride/shared';
import { KpiCard } from '@/components/ui/KpiCard';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { useToastStore } from '@/components/ui/Toast';
import { LiveMap } from '@/components/control-room/LiveMap';
import { AlertCard } from '@/components/control-room/AlertCard';
import { ActivityFeed } from '@/components/control-room/ActivityFeed';
import { VehicleDetailPanel } from '@/components/control-room/VehicleDetailPanel';
import { EscalationModal } from '@/components/control-room/EscalationModal';
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Play, Square } from 'lucide-react';

export default function SafetyBoardPage() {
  const language = useLanguageStore((s) => s.language);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [escalatingAlertId, setEscalatingAlertId] = useState<string | null>(null);

  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const acknowledgeSafetyAlert = useSafetyAlertStore((s) => s.acknowledgeSafetyAlert);
  const escalateSafetyAlert = useSafetyAlertStore((s) => s.escalateSafetyAlert);
  const dismissSafetyAlert = useSafetyAlertStore((s) => s.dismissSafetyAlert);
  const tenants = useTenantStore((s) => s.tenants);
  const traccarStore = useTraccarStore();
  const addToast = useToastStore((s) => s.addToast);

  const tenantId = 'T1';
  const tenant = tenants.find((t) => t.id === tenantId);
  const tenantTrips = trips.filter((t) => t.tenantId === tenantId);
  const activeSos = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'ACTIVE' && tenantId === a.tenantId);

  const isLoading = trips.length === 0 && safetyAlerts.length === 0;

  const activeTripsCount = tenantTrips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
  const anomaliesToday = safetyAlerts.filter(
    (a) => a.tenantId === tenantId && a.type !== 'SOS' && a.status === 'ACTIVE' && new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const resolvedToday = safetyAlerts.filter(
    (a) => a.tenantId === tenantId && a.status === 'RESOLVED' && new Date(a.resolvedAt || a.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const alertsList = safetyAlerts.filter((a) => a.tenantId === tenantId && a.status === 'ACTIVE').sort((a, b) => {
    if (a.type === 'SOS' && b.type !== 'SOS') return -1;
    if (a.type !== 'SOS' && b.type === 'SOS') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAcknowledge = (id: string) => {
    acknowledgeSafetyAlert(id, 'Preethi');
    addToast({
      type: 'success',
      message: t('sosAcknowledged', language),
      duration: 3000,
    });
  };

  const handleEscalate = (id: string) => {
    setEscalatingAlertId(id);
  };

  const confirmEscalate = () => {
    if (escalatingAlertId) {
      escalateSafetyAlert(escalatingAlertId);
      setEscalatingAlertId(null);
    }
  };

  const handleToggleDemo = () => {
    if (traccarStore.demoSimulationActive) {
      traccarStore.stopDemoSimulation();
      addToast({
        type: 'info',
        message: 'Demo simulation stopped',
        duration: 2000,
      });
    } else {
      // Ensure we're using mock data for the demo
      if (!traccarStore.useMockData) {
        traccarStore.setTraccarConfig(traccarStore.traccarUrl, '', '', true);
      }
      traccarStore.fetchDevices().then(() => {
        traccarStore.startDemoSimulation();
        addToast({
          type: 'success',
          message: '🚗 Demo simulation started — vehicles are now moving!',
          duration: 4000,
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('safetyBoard', language)}</h1>
        <div className="flex items-center gap-4">
          <LiveBadge />

          {/* Demo Simulation Toggle */}
          <button
            onClick={handleToggleDemo}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
              traccarStore.demoSimulationActive
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
            }`}
          >
            {traccarStore.demoSimulationActive ? (
              <>
                <Square className="w-4 h-4" />
                Stop Demo
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Demo
              </>
            )}
          </button>

          <span className="text-sm text-[#8B8FA8]">{tenant?.name || t('unknownTenant', language)}</span>
        </div>
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
            <KpiCard label={t('opsActiveTrips', language)} value={activeTripsCount} icon={<TrendingUp />} />
            <KpiCard label={t('opsSOSActive', language)} value={activeSos.length} icon={<AlertCircle />} trend={activeSos.length > 0 ? { direction: 'up', value: t('urgent', language) } : undefined} />
            <KpiCard label={t('opsAnomaliesToday', language)} value={anomaliesToday} icon={<AlertTriangle />} />
            <KpiCard label={t('opsResolvedToday', language)} value={resolvedToday} icon={<CheckCircle />} trend={{ direction: 'up', value: t('good', language) }} />
          </>
        )}
      </div>

      <Card header={t('liveVehiclePositions', language)}>
        <LiveMap onMarkerClick={setSelectedVehicle} />
        <div className="text-xs text-[#8B8FA8] mt-2">{t('readOnlyContactDispatcher', language)}</div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card header={`${t('activeAlerts', language)} (${alertsList.length})`}>
            <div className="space-y-3">
              {alertsList.length === 0 ? (
                <p className="text-[#8B8FA8]">{t('noActiveAlerts', language)}</p>
              ) : (
                alertsList.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} onEscalate={handleEscalate} />
                ))
              )}
            </div>
          </Card>
        </div>

        <Card header={t('recentActivity', language)}>
          <ActivityFeed alerts={safetyAlerts.filter((a) => a.tenantId === tenantId)} />
        </Card>
      </div>

      {selectedVehicle && (
        <VehicleDetailPanel
          vehicleId={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onAcknowledge={() => {
            const alert = safetyAlerts.find((a) => a.vehicleId === selectedVehicle && a.type === 'SOS' && a.status === 'ACTIVE');
            if (alert) {
              handleAcknowledge(alert.id);
            }
          }}
        />
      )}

      <EscalationModal
        isOpen={!!escalatingAlertId}
        onClose={() => setEscalatingAlertId(null)}
        onEscalate={confirmEscalate}
        alertId={escalatingAlertId || ''}
      />
    </div>
  );
}
