'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, keys, useLanguageStore, t } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/components/ui/Toast';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

type SosEvent = components['schemas']['SosEvent'];

function ElapsedTimer({ raisedAt }: { raisedAt: string }) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(raisedAt).getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [raisedAt]);

  return <span className="text-3xl font-mono font-bold text-red-700">{elapsed}</span>;
}

function AckModal({ event, onClose }: { event: SosEvent; onClose: () => void }) {
  const [note, setNote] = useState('');
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const ackMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/safety/sos/${event.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error('acknowledge failed'), { status: res.status, body: err });
      }
    },
    onSuccess: () => {
      addToast({ type: 'success', message: t('sosAcknowledged', 'en'), duration: 3000 });
      void qc.invalidateQueries({ queryKey: keys.safety.all() });
      onClose();
    },
    onError: (err: unknown) => {
      const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0;
      if (status === 404) {
        addToast({ type: 'info', message: 'SOS event already resolved', duration: 3000 });
        void qc.invalidateQueries({ queryKey: keys.safety.all() });
        onClose();
      } else {
        addToast({ type: 'error', message: 'Failed to acknowledge SOS', duration: 3000 });
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold text-[#1B2A4A]">Acknowledge SOS</h3>
        <p className="text-sm text-[#8B8FA8]">Trip Vehicle: <span className="font-mono">{event.tripVehicleId}</span></p>
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Note (required)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe action taken..."
            rows={3}
            className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => ackMutation.mutate()} disabled={!note.trim() || ackMutation.isPending}>
            {ackMutation.isPending ? 'Acknowledging…' : 'Acknowledge'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResolveModal({ event, onClose }: { event: SosEvent; onClose: () => void }) {
  const [note, setNote] = useState('');
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/safety/sos/${event.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error('resolve failed'), { status: res.status, body: err });
      }
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'SOS resolved', duration: 3000 });
      void qc.invalidateQueries({ queryKey: keys.safety.all() });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to resolve SOS', duration: 3000 });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold text-[#1B2A4A]">Resolve SOS</h3>
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Resolution note (required)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe how the situation was resolved..."
            rows={3}
            className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => resolveMutation.mutate()} disabled={!note.trim() || resolveMutation.isPending}>
            {resolveMutation.isPending ? 'Resolving…' : 'Mark Resolved'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SosPage() {
  const language = useLanguageStore((s) => s.language);
  const [ackTarget, setAckTarget] = useState<SosEvent | null>(null);
  const [resolveTarget, setResolveTarget] = useState<SosEvent | null>(null);

  const { data: sosEvents = [], isLoading } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const activeSos = sosEvents.filter((e) => !e.resolvedAt).sort(
    (a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  );
  const resolvedSos = sosEvents.filter((e) => !!e.resolvedAt).sort(
    (a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime()
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (activeSos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[#1B2A4A]">SOS Board</h1>
        <EmptyState icon={AlertCircle} title={t('allClear', language)} description={t('noActiveSOSEmergencies', language)} />
        {resolvedSos.length > 0 && (
          <Card header={`Resolved SOS (${resolvedSos.length})`}>
            <div className="space-y-2">
              {resolvedSos.slice(0, 10).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                  <div>
                    <span className="font-mono text-xs text-[#8B8FA8]">{ev.tripVehicleId}</span>
                    <p className="text-xs text-[#8B8FA8] mt-0.5">
                      Raised {new Date(ev.raisedAt).toLocaleTimeString()} · Resolved {new Date(ev.resolvedAt!).toLocaleTimeString()}
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">SOS Board</h1>

      <div className="space-y-4">
        {activeSos.map((ev) => (
          <Card key={ev.id} className="bg-red-50 border-l-4 border-red-600">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <div>
                  <h2 className="text-lg font-bold text-red-700">Active SOS</h2>
                  <p className="text-sm font-mono text-red-600">{ev.tripVehicleId}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-600 mb-1">{t('elapsedTime', language)}</p>
                <ElapsedTimer raisedAt={ev.raisedAt} />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#8B8FA8]">Trip Vehicle ID</p>
                <p className="font-mono text-[#1B2A4A]">{ev.tripVehicleId}</p>
              </div>
              <div>
                <p className="text-xs text-[#8B8FA8]">Raised At</p>
                <p className="text-[#1B2A4A]">{new Date(ev.raisedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setAckTarget(ev)} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-1 inline" /> {t('acknowledge', language)}
              </Button>
              <Button variant="danger" onClick={() => setResolveTarget(ev)} className="flex-1">
                <Clock className="w-4 h-4 mr-1 inline" /> Mark Resolved
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {resolvedSos.length > 0 && (
        <Card header={`Resolved SOS (${resolvedSos.length})`}>
          <div className="space-y-2">
            {resolvedSos.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                <span className="font-mono text-xs text-[#8B8FA8]">{ev.tripVehicleId}</span>
                <span className="text-xs text-[#8B8FA8]">
                  {new Date(ev.raisedAt).toLocaleTimeString()} → {ev.resolvedAt ? new Date(ev.resolvedAt).toLocaleTimeString() : '—'}
                </span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {ackTarget && <AckModal event={ackTarget} onClose={() => setAckTarget(null)} />}
      {resolveTarget && <ResolveModal event={resolveTarget} onClose={() => setResolveTarget(null)} />}
    </div>
  );
}
