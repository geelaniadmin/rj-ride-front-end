'use client';

import React, { useState } from 'react';
import { useSafetyAlertStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { PiiField } from '@/components/ui/PiiField';
import { useToastStore } from '@/components/ui/Toast';

export default function AnomaliesPage() {
  const [activeTab, setActiveTab] = useState(0);

  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const dismissSafetyAlert = useSafetyAlertStore((s) => s.dismissSafetyAlert);
  const resolveSafetyAlert = useSafetyAlertStore((s) => s.resolveSafetyAlert);
  const addSafetyAlert = useSafetyAlertStore((s) => s.addSafetyAlert);
  const addToast = useToastStore((s) => s.addToast);

  const tenantId = 'T1';
  const deviations = safetyAlerts.filter((a) => a.type === 'ROUTE_DEVIATION' && a.tenantId === tenantId && a.status === 'ACTIVE');
  const stops = safetyAlerts.filter((a) => a.type === 'PROLONGED_STOP' && a.tenantId === tenantId && a.status === 'ACTIVE');
  const noshows = safetyAlerts.filter((a) => a.type === 'NO_SHOW' && a.tenantId === tenantId && a.status === 'ACTIVE');

  const tabDefs = [
    { label: 'Route Deviations', count: deviations.length },
    { label: 'Prolonged Stops', count: stops.length },
    { label: 'No-shows', count: noshows.length },
  ];

  const deviationColumns: Column<any>[] = [
    { key: 'tripId', label: 'Trip ID' },
    { key: 'paxName', label: 'Driver', render: (v) => <PiiField value={v || 'Unknown'} type="name" /> },
    { key: 'location', label: 'Current location' },
    { key: 'deviationMeters', label: 'Deviation' },
    {
      key: 'id',
      label: 'Actions',
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { dismissSafetyAlert(v); addToast({ type: 'success', message: 'Dismissed', duration: 2000 }); }}>
            Dismiss
          </Button>
          <Button size="sm" variant="danger" onClick={() => {
            addSafetyAlert({
              type: 'SOS',
              status: 'ACTIVE',
              tripId: deviations.find((d) => d.id === v)?.tripId || '',
              message: 'Escalated from route deviation',
              severity: 'HIGH',
              createdAt: new Date().toISOString(),
              escalationLevel: 2,
              timeline: [],
              tenantId,
            });
            addToast({ type: 'success', message: 'Escalated to SOS', duration: 2000 });
          }}>
            Escalate
          </Button>
        </div>
      ),
    },
  ];

  const stopsColumns: Column<any>[] = [
    { key: 'tripId', label: 'Trip ID' },
    { key: 'paxName', label: 'Driver', render: (v) => <PiiField value={v || 'Unknown'} type="name" /> },
    { key: 'location', label: 'Stop location' },
    { key: 'stopDuration', label: 'Duration' },
    {
      key: 'id',
      label: 'Actions',
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => addToast({ type: 'info', message: 'Mattermost sent to driver', duration: 2000 })}>
            Check on driver
          </Button>
          <Button size="sm" onClick={() => { resolveSafetyAlert(v, 'Preethi'); addToast({ type: 'success', message: 'Resolved', duration: 2000 }); }}>
            Mark resolved
          </Button>
        </div>
      ),
    },
  ];

  const showColumns: Column<any>[] = [
    { key: 'tripId', label: 'Trip ID' },
    { key: 'location', label: 'Pickup point' },
    { key: 'createdAt', label: 'Scheduled', render: (v) => new Date(v).toLocaleTimeString() },
    { key: 'stopDuration', label: 'Waited' },
    { key: 'paxName', label: 'Passenger', render: (v) => <PiiField value={v || 'Unknown'} type="name" /> },
    {
      key: 'id',
      label: 'Actions',
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => addToast({ type: 'info', message: 'Passenger skipped — trip proceeds', duration: 2000 })}>
            Skip passenger
          </Button>
          <Button size="sm" onClick={() => addToast({ type: 'info', message: 'Driver notified to wait', duration: 2000 })}>
            Wait 5 more min
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">Anomaly Alerts</h1>

      <Card>
        <Tabs tabs={tabDefs} activeIndex={activeTab} onChange={setActiveTab} />

        <div className="mt-4">
          {activeTab === 0 && <DataTable columns={deviationColumns} data={deviations} rowKey="id" />}
          {activeTab === 1 && <DataTable columns={stopsColumns} data={stops} rowKey="id" />}
          {activeTab === 2 && <DataTable columns={showColumns} data={noshows} rowKey="id" />}
        </div>
      </Card>
    </div>
  );
}
