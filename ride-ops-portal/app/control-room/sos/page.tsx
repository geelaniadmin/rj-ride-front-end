'use client';

import React, { useState, useEffect } from 'react';
import { useSafetyAlertStore, useTripStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PiiField } from '@/components/ui/PiiField';
import { TimelineEvent } from '@/components/ui/TimelineEvent';
import { EscalationModal } from '@/components/control-room/EscalationModal';
import { useToastStore } from '@/components/ui/Toast';
import { AlertCircle, Clock } from 'lucide-react';

export default function SosPage() {
  const [elapsed, setElapsed] = useState('00:00');
  const [escalatingAlertId, setEscalatingAlertId] = useState<string | null>(null);

  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const trips = useTripStore((s) => s.trips);
  const acknowledgeSafetyAlert = useSafetyAlertStore((s) => s.acknowledgeSafetyAlert);
  const escalateSafetyAlert = useSafetyAlertStore((s) => s.escalateSafetyAlert);
  const addToast = useToastStore((s) => s.addToast);

  const tenantId = 'T1';
  const activeSos = safetyAlerts.find((a) => a.type === 'SOS' && a.status === 'ACTIVE' && a.tenantId === tenantId);

  useEffect(() => {
    if (!activeSos) return;

    const interval = setInterval(() => {
      const createdAt = new Date(activeSos.createdAt);
      const now = new Date();
      const diff = now.getTime() - createdAt.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSos]);

  if (!activeSos) {
    return <EmptyState icon={AlertCircle} title="All clear" description="No active SOS emergencies" />;
  }

  const trip = trips.find((t) => t.id === activeSos.tripId);
  const resolvedSos = safetyAlerts.filter((a) => a.type === 'SOS' && a.status === 'RESOLVED' && a.tenantId === tenantId);

  const resolvedColumns: Column<any>[] = [
    { key: 'tripId', label: 'Trip ID' },
    { key: 'message', label: 'Message' },
    { key: 'createdAt', label: 'Time', render: (v) => new Date(v).toLocaleTimeString() },
    { key: 'resolvedAt', label: 'Resolved', render: (v) => (v ? new Date(v).toLocaleTimeString() : '—') },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-red-50 border-l-4 border-red-600 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <h2 className="text-2xl font-bold text-red-700">ACTIVE SOS — Trip {activeSos.tripId}</h2>
          </div>
          <div className="text-center">
            <p className="text-sm text-red-600">Elapsed time</p>
            <p className="text-3xl font-mono font-bold text-red-700">{elapsed}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 bg-white p-4 rounded">
          <div>
            <p className="text-xs text-[#8B8FA8]">Passenger</p>
            <PiiField value={activeSos.paxName || 'Unknown'} type="name" />
          </div>
          <div>
            <p className="text-xs text-[#8B8FA8]">Location</p>
            <p className="text-sm text-[#3D434A]">{activeSos.location}</p>
          </div>
          <div>
            <p className="text-xs text-[#8B8FA8]">Vehicle</p>
            <p className="text-sm text-[#3D434A]">{activeSos.vehiclePlate}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded mb-6">
          <p className="text-sm font-semibold text-[#3D434A] mb-3">Escalation track</p>
          <div className="space-y-2">
            {[
              { level: 1, label: 'Driver notified', actor: 'System' },
              { level: 2, label: 'Rajesh dispatcher', actor: 'Rajesh' },
              { level: 3, label: 'Preethi SPOC', actor: 'Preethi' },
              { level: 4, label: 'Authorities', actor: 'Pending' },
            ].map((item) => {
              const timeline = activeSos.timeline.find((t) => t.level === item.level);
              const isDone = timeline?.status === 'done';
              return (
                <div key={item.level} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {isDone ? '✓' : item.level}
                  </div>
                  <p className="text-sm text-[#3D434A]">
                    {item.label} {isDone ? '✓' : '—'} {item.actor}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => acknowledgeSafetyAlert(activeSos.id, 'Preethi')} className="flex-1">
            ✓ Acknowledge
          </Button>
          <Button variant="danger" onClick={() => setEscalatingAlertId(activeSos.id)} className="flex-1">
            ⬆ Escalate to L4
          </Button>
          <Button variant="secondary" onClick={() => addToast({ type: 'success', message: 'Mattermost message sent to driver', duration: 3000 })} className="flex-1">
            💬 Message driver
          </Button>
          <Button variant="secondary" onClick={() => addToast({ type: 'success', message: 'WhatsApp sent to passenger', duration: 3000 })} className="flex-1">
            💬 Message pax
          </Button>
        </div>
      </Card>

      <Card header="Emergency timeline">
        <div className="space-y-4">
          {activeSos.timeline.map((item) => (
            <TimelineEvent
              key={item.level}
              icon={Clock}
              timestamp={item.timestamp || new Date().toISOString()}
              title={item.label}
              description={item.actor}
            />
          ))}
          <TimelineEvent
            icon={AlertCircle}
            timestamp={new Date().toISOString()}
            title="Situation ongoing"
            description="No update received"
          />
        </div>
      </Card>

      <Card header={`Resolved SOS (${resolvedSos.length})`}>
        <DataTable columns={resolvedColumns} data={resolvedSos} rowKey="id" />
      </Card>

      <EscalationModal
        isOpen={!!escalatingAlertId}
        onClose={() => setEscalatingAlertId(null)}
        onEscalate={() => {
          if (escalatingAlertId) {
            escalateSafetyAlert(escalatingAlertId);
            setEscalatingAlertId(null);
          }
        }}
        alertId={escalatingAlertId || ''}
      />
    </div>
  );
}
