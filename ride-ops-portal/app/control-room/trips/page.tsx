'use client';

import React, { useState } from 'react';
import { useTripStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PiiField } from '@/components/ui/PiiField';
import { TripRequest } from '@ride/shared';
import { formatDate } from '@/lib/utils';

export default function TripsPage() {
  const [selectedTrip, setSelectedTrip] = useState<TripRequest | null>(null);

  const trips = useTripStore((s) => s.trips);
  const tenantId = 'T1';
  const tenantTrips = trips.filter((t) => t.tenantId === tenantId);

  const columns: Column<TripRequest>[] = [
    { key: 'id', label: 'Trip ID', sortable: true },
    { key: 'customerId', label: 'Customer', render: (v) => `Customer ${v.substring(0, 3)}` },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'vehicles', label: 'Vehicles', render: (v: any) => v.length },
    { key: 'createdAt', label: 'Created', render: (v) => formatDate(v), sortable: true },
    {
      key: 'id',
      label: 'Action',
      render: (v, row) => (
        <button
          onClick={() => setSelectedTrip(row)}
          className="text-[#2563EB] hover:text-blue-700 text-sm font-medium"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">All Trips (Read-only)</h1>

      <AlertBanner type="info" message="Read-only view — contact the dispatcher to make changes" />

      <Card header={`Trips (${tenantTrips.length})`}>
        <DataTable columns={columns} data={tenantTrips} rowKey="id" />
      </Card>

      <Drawer
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title={selectedTrip?.id}
        side="right"
      >
        {selectedTrip && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">Status</p>
              <StatusBadge status={selectedTrip.status} />
            </div>

            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">Created</p>
              <p className="text-sm text-[#3D434A]">{formatDate(selectedTrip.createdAt)}</p>
            </div>

            <div>
              <p className="text-xs text-[#8B8FA8] mb-2">Route</p>
              <div className="space-y-2">
                {selectedTrip.stops.map((stop) => (
                  <div key={stop.seq} className="text-sm">
                    <p className="font-medium text-[#3D434A]">
                      {stop.type === 'PICKUP' ? '🔴' : '🟢'} {stop.address}
                    </p>
                    <p className="text-xs text-[#8B8FA8]">
                      {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8B8FA8] mb-2">Vehicles</p>
              <div className="space-y-2">
                {selectedTrip.vehicles.map((vehicle, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded border border-[#E0E0E0]">
                    <p className="text-xs text-[#8B8FA8]">Vehicle {idx + 1}</p>
                    <p className="text-sm font-medium text-[#3D434A]">{vehicle.vehicleId || 'Unassigned'}</p>
                    <StatusBadge status={vehicle.status} />
                    {vehicle.driverId && (
                      <div className="mt-1">
                        <p className="text-xs text-[#8B8FA8]">Driver</p>
                        <PiiField value={vehicle.driverId} type="name" />
                      </div>
                    )}
                    <p className="text-xs text-[#8B8FA8] mt-1">Passengers: {vehicle.pax.length}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedTrip.reference && (
              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Reference</p>
                <p className="text-sm text-[#3D434A]">{selectedTrip.reference}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
