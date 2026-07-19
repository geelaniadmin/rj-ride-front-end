'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, useRideEvents, keys } from '@ride/shared';
import type { components } from '@ride/shared/api/schema.d';
import { useQueryClient } from '@tanstack/react-query';
import { OpsShell } from '@/components/layout/OpsShell';
import { ToastProvider, useToastStore } from '@/components/ui/Toast';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

type SosEvent = components['schemas']['SosEvent'];

const OPS_ROLES = ['OPS_ADMIN', 'OPS_AGENT'] as const;

function SosNotifier() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const audioRef = useRef<AudioContext | null>(null);

  const playAlert = () => {
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
    }
  };

  useRideEvents({
    invalidationMap: {
      'trip.created': keys.trips.all(),
      'trip.updated': keys.trips.all(),
      'trip.cancelled': keys.trips.all(),
      'trip.completed': keys.trips.all(),
      'trip.assigned': keys.dispatch.board(),
      'billing.invoice_created': keys.billing.all(),
      'billing.invoice_updated': keys.billing.all(),
    },
    handler: (event) => {
      if (event.type === 'sos.raised') {
        playAlert();
        addToast({ type: 'error', message: 'SOS raised — check control room immediately', duration: 10000 });
        const payload = (event as unknown as { payload?: SosEvent }).payload;
        if (payload) {
          qc.setQueryData<SosEvent[]>(
            keys.safety.sos.list({}),
            (prev) => [payload, ...(prev ?? [])],
          );
        }
        void qc.invalidateQueries({ queryKey: keys.safety.all() });
      }
      if ((event.type as string) === 'sos.resolved') {
        void qc.invalidateQueries({ queryKey: keys.safety.all() });
      }
    },
  });

  return null;
}

interface RootLayoutContentProps {
  children: React.ReactNode;
}

export function RootLayoutContent({ children }: RootLayoutContentProps) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }
    if (user) {
      const isOps = OPS_ROLES.includes(user.role as typeof OPS_ROLES[number]);
      if (!isOps && pathname !== '/login') {
        router.push('/login');
        return;
      }
      if (pathname === '/login' || pathname === '/') {
        router.push('/control-room');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <OpsShell>
        <ToastProvider />
        <SosNotifier />
        {children}
      </OpsShell>
    </>
  );
}
