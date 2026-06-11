'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { OpsShell } from '@/components/layout/OpsShell';
import { ToastProvider } from '@/components/ui/Toast';
import { SeedInitializer } from '@/components/SeedInitializer';
import { useCrossTabSync } from '@/hooks/useCrossTabSync';
import { useTripStore } from '@ride/shared';

interface RootLayoutContentProps {
  children: React.ReactNode;
}

export function RootLayoutContent({ children }: RootLayoutContentProps) {
  const { session } = useOpsSessionStore();
  const router = useRouter();
  const pathname = usePathname();
  const trips = useTripStore((s) => s.trips);

  useCrossTabSync();

  useEffect(() => {
    // Stores are auto-seeded on first render via Zustand persist
  }, []);

  useEffect(() => {
    if (!session && pathname !== '/login') {
      router.push('/login');
    } else if (session && pathname === '/') {
      const roleRoute = {
        'control-room': '/control-room',
        'rate-manager': '/rate-manager',
        'super-admin': '/super-admin',
      }[session.role];
      router.push(roleRoute);
    }
  }, [session, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <OpsShell>
      <ToastProvider />
      <SeedInitializer />
      {children}
    </OpsShell>
  );
}
