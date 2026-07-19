'use client';

import React, { useState } from 'react';
import { useLanguageStore, t } from '@ride/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { useToastStore } from '@/components/ui/Toast';
import { PiiField } from '@/components/ui/PiiField';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { TimelineEvent } from '@/components/ui/TimelineEvent';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Users, TrendingUp, Calendar } from 'lucide-react';

interface TestRow {
  id: string;
  name: string;
  status: 'CONFIRMED' | 'ASSIGNED' | 'IN_PROGRESS';
  value: number;
}

const testData: TestRow[] = [
  { id: '1', name: 'Trip A', status: 'CONFIRMED', value: 5000 },
  { id: '2', name: 'Trip B', status: 'ASSIGNED', value: 7500 },
  { id: '3', name: 'Trip C', status: 'IN_PROGRESS', value: 10000 },
];

export default function UITestPage() {
  const language = useLanguageStore((s) => s.language);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { addToast } = useToastStore();

  const columns: Column<TestRow>[] = [
    { key: 'name', label: 'Trip Name', sortable: true },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val as import('@ride/shared').TripStatus} /> },
    { key: 'value', label: 'Amount (₹)', sortable: true, render: (val) => `₹${val}` },
  ];

  const showToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    addToast({
      type,
      message: `This is a ${type} toast message`,
      duration: 3000,
    });
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">{t('uiComponents', language)}</h1>
        <p className="text-[#8B8FA8]">{t('componentLibraryShowcase', language)}</p>
      </div>

      {/* Badges */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('badges', language)}</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="blue">Blue</Badge>
          <Badge variant="green">Green</Badge>
          <Badge variant="amber">Amber</Badge>
          <Badge variant="red">Red</Badge>
          <Badge variant="purple">Purple</Badge>
          <Badge variant="teal">Teal</Badge>
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('buttons', language)}</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="primary" loading>
            Loading
          </Button>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('cardsKpiCards', language)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Active Trips" value={42} unit="trips" icon={<TrendingUp className="w-6 h-6" />} />
          <KpiCard
            label="Revenue"
            value="₹125,500"
            trend={{ direction: 'up', value: '12% today' }}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <Card header="Basic Card" footer={<Button variant="ghost">Learn More</Button>}>
            This is a basic card with header and footer slots.
          </Card>
        </div>
      </section>

      {/* Status Badges */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('statusBadges', language)}</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="DRAFT" />
          <StatusBadge status="CONFIRMED" />
          <StatusBadge status="ASSIGNED" />
          <StatusBadge status="IN_PROGRESS" />
          <StatusBadge status="COMPLETED" />
          <StatusBadge status="BILLED" />
          <StatusBadge status="SOS" />
        </div>
      </section>

      {/* PII Field */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('piiField', language)}</h2>
        <Card>
          <div className="space-y-2">
            <p className="text-sm text-[#8B8FA8] mb-3">{t('clickToReveal', language)}</p>
            <PiiField value="John Doe" type="name" />
            <PiiField value="9876543210" type="phone" />
            <PiiField value="john@example.com" type="email" />
          </div>
        </Card>
      </section>

      {/* Data Table */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('dataTable', language)}</h2>
        <Card>
          <DataTable columns={columns} data={testData} rowKey="id" pageSize={2} />
        </Card>
      </section>

      {/* Modals & Drawers */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('modalsDrawers', language)}</h2>
        <div className="flex gap-3">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Modal Example">
          <p className="text-sm text-[#3D434A] mb-4">This is a modal dialog with title and footer.</p>
          <div className="space-y-2 text-xs text-[#8B8FA8]">
            <p>• Click outside to close</p>
            <p>• Or use the close button</p>
          </div>
        </Modal>

        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer Example">
          <p className="text-sm text-[#3D434A] mb-4">This is a side drawer panel.</p>
          <p className="text-xs text-[#8B8FA8]">It slides in from the right and overlays content.</p>
        </Drawer>
      </section>

      {/* Alerts */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('alertBanners', language)}</h2>
        <div className="space-y-3">
          <AlertBanner type="info" message="This is an informational banner" />
          <AlertBanner type="warning" message="This is a warning message" onDismiss={() => {}} />
          <AlertBanner type="error" message="This is an error alert" onDismiss={() => {}} />
        </div>
      </section>

      {/* Toasts */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('toastNotifications', language)}</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => showToast('success')} variant="primary">
            Success Toast
          </Button>
          <Button onClick={() => showToast('error')} variant="danger">
            Error Toast
          </Button>
          <Button onClick={() => showToast('warning')}>Warning Toast</Button>
          <Button onClick={() => showToast('info')} variant="secondary">
            Info Toast
          </Button>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('timelineEvents', language)}</h2>
        <Card>
          <TimelineEvent
            icon={Users}
            timestamp={new Date().toISOString()}
            title="Trip Confirmed"
            description="Driver assigned to trip"
          />
          <TimelineEvent
            icon={TrendingUp}
            timestamp="2026-07-19T12:00:00.000Z"
            title="Pickup Completed"
            description="Passenger picked up at main office"
          />
          <TimelineEvent
            icon={Calendar}
            timestamp="2026-07-19T11:00:00.000Z"
            title="Trip Started"
            description="Vehicle en route to destination"
          />
        </Card>
      </section>

      {/* Live Badge & Loading Skeleton */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('liveBadgeLoading', language)}</h2>
        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#8B8FA8] mb-2">Live Badge:</p>
              <LiveBadge />
            </div>
            <div>
              <p className="text-sm text-[#8B8FA8] mb-2">Loading Skeleton:</p>
              <LoadingSkeleton />
              <LoadingSkeleton className="mt-2" width="w-4/5" />
              <LoadingSkeleton className="mt-2" width="w-3/5" />
            </div>
          </div>
        </Card>
      </section>

      {/* Empty State */}
      <section>
        <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">{t('emptyState', language)}</h2>
        <Card>
          <EmptyState icon={Users} title="No Data Available" description="Create your first item to get started" />
        </Card>
      </section>
    </div>
  );
}
