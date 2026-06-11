'use client';

import { useEffect } from 'react';
import { useSafetyAlertStore } from '@ride/shared';
import { useTripStore } from '@/stores/tripStore';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useCustomerStore } from '@/stores/customerStore';

export function useCrossTabSync() {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ride-safety-alerts') {
        useSafetyAlertStore.persist.rehydrate();
      } else if (e.key === 'ride-trips') {
        useTripStore.persist.rehydrate();
      } else if (e.key === 'ride-rate-cards') {
        useRateCardStore.persist.rehydrate();
      } else if (e.key === 'ride-customers') {
        useCustomerStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
}
