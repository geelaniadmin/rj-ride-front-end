'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useTripStore } from '@ride/shared';
import { useSafetyAlertStore } from '@ride/shared';
import { Button } from '@/components/ui/Button';
import { PiiField } from '@/components/ui/PiiField';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface VehicleDetailPanelProps {
  vehicleId: string;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export function VehicleDetailPanel({ vehicleId, onClose, onAcknowledge }: VehicleDetailPanelProps) {
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);

  const trip = trips.find((t) => t.vehicles.some((v) => v.vehicleId === vehicleId));
  const vehicle = trip?.vehicles.find((v) => v.vehicleId === vehicleId);
  const sosAlert = safetyAlerts.find((a) => a.vehicleId === vehicleId && a.type === 'SOS' && a.status === 'ACTIVE');

  if (!vehicle || !trip) return null;

  const driver = trip.vehicles.find((v) => v.driverId)?.driverId;

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-64px)] w-96 bg-white border-l border-border shadow-lg z-30 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-[#3D434A]">Vehicle Details</h3>
        <button onClick={onClose} className="text-[#8B8FA8] hover:text-[#3D434A]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {sosAlert && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="font-semibold text-red-700 mb-2">🚨 SOS ACTIVE</p>
            <Button variant="danger" size="sm" onClick={onAcknowledge} className="w-full">
              ✓ Acknowledge SOS
            </Button>
          </div>
        )}

        <div>
          <p className="text-xs text-[#8B8FA8] mb-1">Vehicle ID</p>
          <p className="font-mono text-[#3D434A]">{vehicleId}</p>
        </div>

        <div>
          <p className="text-xs text-[#8B8FA8] mb-1">Status</p>
          <StatusBadge status={vehicle.status} />
        </div>

        <div>
          <p className="text-xs text-[#8B8FA8] mb-1">Trip ID</p>
          <p className="font-mono text-[#3D434A]">{trip.id}</p>
        </div>

        {driver && (
          <div>
            <p className="text-xs text-[#8B8FA8] mb-1">Driver</p>
            <PiiField value={driver} type="name" />
          </div>
        )}

        <div>
          <p className="text-xs text-[#8B8FA8] mb-1">Passengers</p>
          <p className="text-[#3D434A]">{vehicle.pax.length} aboard</p>
        </div>

        {vehicle.pax.length > 0 && (
          <div>
            <p className="text-xs text-[#8B8FA8] mb-2">Passenger Names</p>
            <div className="space-y-1">
              {vehicle.pax.map((pax) => (
                <PiiField key={pax.id} value={pax.name || 'Unknown'} type="name" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
