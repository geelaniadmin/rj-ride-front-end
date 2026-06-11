'use client';

import { useEffect } from 'react';
import { useSafetyAlertStore } from '@ride/shared';
import { useTripStore } from '@/stores/tripStore';

export function useCrossTabSync() {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ride-safety-alerts') {
        useSafetyAlertStore.persist.rehydrate();
      } else if (e.key === 'ride-trips') {
        useTripStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
}
