'use client';

import React, { useState } from 'react';
import { useTripStore, useSafetyAlertStore } from '@ride/shared';
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
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SafetyBoardPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [escalatingAlertId, setEscalatingAlertId] = useState<string | null>(null);

  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const acknowledgeSafetyAlert = useSafetyAlertStore((s) => s.acknowledgeSafetyAlert);
  const escalateSafetyAlert = useSafetyAlertStore((s) => s.escalateSafetyAlert);
  const dismissSafetyAlert = useSafetyAlertStore((s) => s.dismissSafetyAlert);
  const tenants = useTenantStore((s) => s.tenants);
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
      message: 'SOS acknowledged',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Safety Board</h1>
        <div className="flex items-center gap-4">
          <LiveBadge />
          <span className="text-sm text-[#8B8FA8]">{tenant?.name || 'Unknown Tenant'}</span>
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
            <KpiCard label="Active trips" value={activeTripsCount} icon={<TrendingUp />} />
            <KpiCard label="SOS active" value={activeSos.length} icon={<AlertCircle />} trend={activeSos.length > 0 ? { direction: 'up', value: 'Urgent' } : undefined} />
            <KpiCard label="Anomalies today" value={anomaliesToday} icon={<AlertTriangle />} />
            <KpiCard label="Resolved today" value={resolvedToday} icon={<CheckCircle />} trend={{ direction: 'up', value: 'Good' }} />
          </>
        )}
      </div>

      <Card header="Live vehicle positions">
        <LiveMap onMarkerClick={setSelectedVehicle} />
        <div className="text-xs text-[#8B8FA8] mt-2">Read-only — contact dispatcher to reassign</div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card header={`Active alerts (${alertsList.length})`}>
            <div className="space-y-3">
              {alertsList.length === 0 ? (
                <p className="text-[#8B8FA8]">No active alerts</p>
              ) : (
                alertsList.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} onEscalate={handleEscalate} />
                ))
              )}
            </div>
          </Card>
        </div>

        <Card header="Recent activity">
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
