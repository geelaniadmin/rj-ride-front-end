'use client';

import { useEffect } from 'react';
import { useSafetyAlertStore, useTripStore, useCustomerStore, useTenantStore } from '@ride/shared';
import { useRateCardStore } from '@/stores/rateCardStore';

export function useCrossTabSync() {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ride-safety-alerts') {
        useSafetyAlertStore.persist.rehydrate();
      } else      if (e.key === 'ride-ops-trips') {
        useTripStore.persist.rehydrate();
      } else if (e.key === 'ride-ops-rate-cards') {
        useRateCardStore.persist.rehydrate();
      } else if (e.key === 'ride-ops-customers') {
        useCustomerStore.persist.rehydrate();
      } else if (e.key === 'ride-tenant') {
        useTenantStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
}
