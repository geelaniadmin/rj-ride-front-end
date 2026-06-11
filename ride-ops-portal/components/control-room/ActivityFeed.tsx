'use client';

import React from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle } from 'lucide-react';
import { SafetyAlert } from '@ride/shared';
import { TimelineEvent } from '@/components/ui/TimelineEvent';

interface ActivityFeedProps {
  alerts: SafetyAlert[];
}

export function ActivityFeed({ alerts }: ActivityFeedProps) {
  const sorted = [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

  const getIcon = (type: SafetyAlert['type']) => {
    switch (type) {
      case 'SOS':
        return AlertOctagon;
      case 'ROUTE_DEVIATION':
        return AlertTriangle;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <p className="text-center text-[#8B8FA8] py-4">No recent activity</p>
      ) : (
        sorted.map((alert) => (
          <TimelineEvent
            key={alert.id}
            icon={getIcon(alert.type)}
            timestamp={alert.createdAt}
            title={alert.type.replace(/_/g, ' ')}
            description={`${alert.message} — ${alert.tripId}`}
          />
        ))
      )}
    </div>
  );
}
