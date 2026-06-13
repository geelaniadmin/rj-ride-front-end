'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { OpsShell } from '@/components/layout/OpsShell';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SeedInitializer } from '@/components/SeedInitializer';
import { useCrossTabSync } from '@/hooks/useCrossTabSync';
import { useTripStore } from '@ride/shared';

interface RootLayoutContentProps {
  children: React.ReactNode;
}

export function RootLayoutContent({ children }: RootLayoutContentProps) {
  const { session, hydrated } = useOpsSessionStore();
  const router = useRouter();
  const pathname = usePathname();
  const trips = useTripStore((s) => s.trips);

  useCrossTabSync();

  useEffect(() => {
    // Stores are auto-seeded on first render via Zustand persist
  }, []);

  useEffect(() => {
    if (!hydrated) return; // Wait for Zustand persist to rehydrate from localStorage

    if (!session && pathname !== '/login') {
      router.push('/login');
    } else if (session && (pathname === '/login' || pathname === '/')) {
      // Logged in but on login page or root → redirect to role dashboard
      const roleRoute = {
        'control-room': '/control-room',
        'rate-manager': '/rate-manager',
        'super-admin': '/super-admin',
      }[session.role];
      router.push(roleRoute);
    }
  }, [session, hydrated, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <>
      <OfflineBanner />
      <OpsShell>
        <ToastProvider />
        <SeedInitializer />
        {children}
      </OpsShell>
    </>
  );
}
