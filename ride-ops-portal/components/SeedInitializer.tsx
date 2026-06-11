'use client';

import { useEffect } from 'react';
import { useTripStore, useAlertStore } from '@ride/shared';
import { useTenantStore } from '@/stores/tenantStore';

export function SeedInitializer() {
  const trips = useTripStore((s) => s.trips);
  const alerts = useAlertStore((s) => s.alerts);
  const tenants = useTenantStore((s) => s.tenants);

  useEffect(() => {
    // Stores are pre-populated via Zustand persist on mount
  }, []);

  const tripCount = trips.length;
  const alertCount = alerts.length;
  const tenantCount = tenants.length;

  return (
    <div className="fixed bottom-4 left-4 text-xs text-[#8B8FA8] bg-white border border-[#E0E0E0] rounded px-3 py-2 font-mono z-40">
      Trips: {tripCount} | Alerts: {alertCount} | Tenants: {tenantCount}
    </div>
  );
}
