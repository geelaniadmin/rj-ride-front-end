'use client';

import React, { useState } from 'react';
import { useSafetyAlertStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { PiiField } from '@/components/ui/PiiField';
import { useToastStore } from '@/components/ui/Toast';
import { useLanguageStore, t } from '@ride/shared';

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

  const language = useLanguageStore((s) => s.language);

  const tabDefs = [
    { label: t('routeDeviations', language), count: deviations.length },
    { label: t('prolongedStops', language), count: stops.length },
    { label: t('noShows', language), count: noshows.length },
  ];

  const deviationColumns: Column<any>[] = [
    { key: 'tripId', label: t('tripId', language) },
    { key: 'paxName', label: t('driver', language), render: (v) => <PiiField value={v || t('unknown', language)} type="name" /> },
    { key: 'location', label: t('currentLocation', language) },
    { key: 'deviationMeters', label: t('deviation', language) },
    {
      key: 'id',
      label: t('actions', language),
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { dismissSafetyAlert(v); addToast({ type: 'success', message: t('dismissed', language), duration: 2000 }); }}>
            {t('dismiss', language)}
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
            addToast({ type: 'success', message: t('escalatedToSOS', language), duration: 2000 });
          }}>
            {t('escalate', language)}
          </Button>
        </div>
      ),
    },
  ];

  const stopsColumns: Column<any>[] = [
    { key: 'tripId', label: t('tripId', language) },
    { key: 'paxName', label: t('driver', language), render: (v) => <PiiField value={v || t('unknown', language)} type="name" /> },
    { key: 'location', label: t('stopLocation', language) },
    { key: 'stopDuration', label: t('duration', language) },
    {
      key: 'id',
      label: t('actions', language),
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => addToast({ type: 'info', message: t('mattermostSentToDriver', language), duration: 2000 })}>
            {t('checkOnDriver', language)}
          </Button>
          <Button size="sm" onClick={() => { resolveSafetyAlert(v, 'Preethi'); addToast({ type: 'success', message: t('resolved', language), duration: 2000 }); }}>
            {t('markResolved', language)}
          </Button>
        </div>
      ),
    },
  ];

  const showColumns: Column<any>[] = [
    { key: 'tripId', label: t('tripId', language) },
    { key: 'location', label: t('pickupPoint', language) },
    { key: 'createdAt', label: t('scheduled', language), render: (v) => new Date(v).toLocaleTimeString() },
    { key: 'stopDuration', label: t('waited', language) },
    { key: 'paxName', label: t('passenger', language), render: (v) => <PiiField value={v || t('unknown', language)} type="name" /> },
    {
      key: 'id',
      label: t('actions', language),
      render: (v) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => addToast({ type: 'info', message: t('passengerSkipped', language), duration: 2000 })}>
            {t('skipPassenger', language)}
          </Button>
          <Button size="sm" onClick={() => addToast({ type: 'info', message: t('driverNotifiedToWait', language), duration: 2000 })}>
            {t('wait5MoreMin', language)}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('anomalyAlerts', language)}</h1>

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
