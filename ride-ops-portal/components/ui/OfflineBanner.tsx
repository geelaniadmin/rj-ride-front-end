'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3 z-30">
      <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800">
        <span className="font-semibold">Offline —</span> showing cached data. Create/publish buttons are disabled.
      </p>
    </div>
  );
}
