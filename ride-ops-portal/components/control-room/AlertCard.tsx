'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import { SafetyAlert } from '@ride/shared';
import { Button } from '@/components/ui/Button';
import { PiiField } from '@/components/ui/PiiField';
import { timeAgo } from '@/lib/utils';

interface AlertCardProps {
  alert: SafetyAlert;
  onAcknowledge: (id: string) => void;
  onEscalate: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge, onEscalate }: AlertCardProps) {
  const accentColors: Record<string, string> = {
    SOS: 'border-l-4 border-[#E84040] bg-red-50',
    ROUTE_DEVIATION: 'border-l-4 border-[#F0A030] bg-amber-50',
    NO_SHOW: 'border-l-4 border-gray-400 bg-gray-50',
    PROLONGED_STOP: 'border-l-4 border-[#F0A030] bg-amber-50',
  };

  const icons: Record<string, React.ReactNode> = {
    SOS: <AlertOctagon className="w-5 h-5 text-[#E84040]" />,
    ROUTE_DEVIATION: <AlertTriangle className="w-5 h-5 text-[#F0A030]" />,
    NO_SHOW: <AlertCircle className="w-5 h-5 text-gray-600" />,
    PROLONGED_STOP: <AlertTriangle className="w-5 h-5 text-[#F0A030]" />,
  };

  return (
    <div className={`p-4 rounded-lg ${accentColors[alert.type]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icons[alert.type]}
          <div>
            <p className="font-semibold text-[#3D434A]">{alert.type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-[#8B8FA8]">Trip {alert.tripId}</p>
          </div>
        </div>
        <p className="text-xs text-[#8B8FA8]">{timeAgo(alert.createdAt)}</p>
      </div>

      {alert.location && (
        <p className="text-sm text-[#3D434A] mb-2">📍 {alert.location}</p>
      )}

      {alert.deviationMeters && (
        <p className="text-sm text-[#3D434A] mb-2">Deviation: {alert.deviationMeters}m</p>
      )}

      {alert.stopDuration && (
        <p className="text-sm text-[#3D434A] mb-2">Duration: {alert.stopDuration} minutes</p>
      )}

      {alert.driverId && (
        <div className="mb-3 text-sm">
          <p className="text-[#8B8FA8]">Driver: <PiiField value={alert.paxName || 'Unknown'} type="name" className="inline" /></p>
          {alert.vehiclePlate && (
            <p className="text-[#8B8FA8]">Vehicle: {alert.vehiclePlate}</p>
          )}
        </div>
      )}

      {alert.status === 'ACTIVE' && (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => onAcknowledge(alert.id)}>
            ✓ Acknowledge
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onEscalate(alert.id)}>
            ⬆ Escalate
          </Button>
        </div>
      )}
    </div>
  );
}
