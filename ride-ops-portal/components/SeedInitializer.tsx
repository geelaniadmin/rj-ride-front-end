'use client';

import { useEffect } from 'react';
import { useTripStore, useAlertStore, useSafetyAlertStore } from '@ride/shared';
import { useTenantStore } from '@/stores/tenantStore';
import { useTripStore as useLocalTripStore } from '@/stores/tripStore';

export function SeedInitializer() {
  const trips = useTripStore((s) => s.trips);
  const alerts = useAlertStore((s) => s.alerts);
  const tenants = useTenantStore((s) => s.tenants);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const localTrips = useLocalTripStore((s) => s.trips);

  const { addTripSeed } = useAddTripSeed();
  const { addSafetyAlertSeed } = useAddSafetyAlertSeed();

  useEffect(() => {
    if (localTrips.length === 0) {
      addTripSeed();
    }
  }, [localTrips.length, addTripSeed]);

  useEffect(() => {
    if (safetyAlerts.length === 0) {
      addSafetyAlertSeed();
    }
  }, [safetyAlerts.length, addSafetyAlertSeed]);

  const tripCount = localTrips.length;
  const alertCount = safetyAlerts.length;
  const tenantCount = tenants.length;

  return (
    <div className="fixed bottom-4 left-4 text-xs text-[#8B8FA8] bg-white border border-[#E0E0E0] rounded px-3 py-2 font-mono z-40">
      Trips: {tripCount} | Safety Alerts: {alertCount} | Tenants: {tenantCount}
    </div>
  );
}

function useAddTripSeed() {
  const setTrips = useLocalTripStore((s) => s.setTrips);
  const addTripFn = useTripStore((s) => s.addTrip);

  return {
    addTripSeed: () => {
      const baseTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const trips = [
        {
          id: 'RIDE-SEED-001',
          tenantId: 'T1',
          customerId: 'C1',
          createdVia: 'MANUAL' as const,
          stops: [
            {
              seq: 1,
              type: 'PICKUP' as const,
              locationType: 'ADDRESS' as const,
              address: 'KIA Bangalore, Airport Road',
              lat: 13.1979,
              lng: 77.7064,
              plannedTime: new Date(baseTime.getTime() + 30 * 60 * 1000).toISOString(),
            },
            {
              seq: 2,
              type: 'DROP' as const,
              locationType: 'HOTEL' as const,
              address: 'ITC Gardenia, Bengaluru',
              lat: 12.9716,
              lng: 77.5946,
              plannedTime: new Date(baseTime.getTime() + 90 * 60 * 1000).toISOString(),
            },
          ],
          vehicles: [
            {
              id: 'VH1',
              requestedVehicleTypeId: 'VT1',
              vehicleId: 'VH1',
              driverId: 'D1',
              status: 'ASSIGNED' as const,
              pax: [{ id: 'PAX1', name: 'Anil Kumar', phone: '9876543210' }],
              lockedPrice: 4500000,
              lockedRateCardVersion: 1,
            },
          ],
          schedule: { type: 'ONE_OFF' as const, when: baseTime.toISOString() },
          status: 'ASSIGNED' as const,
          autoAssign: false,
          reference: 'BOOKING-001',
          createdAt: baseTime.toISOString(),
        },
        {
          id: 'RIDE-SEED-002',
          tenantId: 'T1',
          customerId: 'C2',
          createdVia: 'MANUAL' as const,
          stops: [
            {
              seq: 1,
              type: 'PICKUP' as const,
              locationType: 'ADDRESS' as const,
              address: 'Manyata Tech Park, Bangalore',
              lat: 13.1261,
              lng: 77.6683,
              plannedTime: new Date(baseTime.getTime() + 45 * 60 * 1000).toISOString(),
            },
            {
              seq: 2,
              type: 'DROP' as const,
              locationType: 'HOTEL' as const,
              address: 'Sheraton Grand Bangalore',
              lat: 12.9716,
              lng: 77.5946,
              plannedTime: new Date(baseTime.getTime() + 120 * 60 * 1000).toISOString(),
            },
          ],
          vehicles: [
            {
              id: 'VH2',
              requestedVehicleTypeId: 'VT1',
              vehicleId: 'VH2',
              driverId: 'D2',
              status: 'EN_ROUTE_PICKUP' as const,
              pax: [{ id: 'PAX2', name: 'Suresh Gowda', phone: '9876543211' }],
              lockedPrice: 5200000,
              lockedRateCardVersion: 1,
            },
          ],
          schedule: { type: 'ONE_OFF' as const, when: baseTime.toISOString() },
          status: 'IN_PROGRESS' as const,
          autoAssign: false,
          reference: 'BOOKING-002',
          createdAt: baseTime.toISOString(),
        },
        {
          id: 'RIDE-SEED-003',
          tenantId: 'T1',
          customerId: 'C3',
          createdVia: 'MANUAL' as const,
          stops: [
            {
              seq: 1,
              type: 'PICKUP' as const,
              locationType: 'ADDRESS' as const,
              address: 'Electronic City Phase 1, Bangalore',
              lat: 12.8386,
              lng: 77.6869,
              plannedTime: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
            },
            {
              seq: 2,
              type: 'DROP' as const,
              locationType: 'HOTEL' as const,
              address: 'Hilton Bangalore',
              lat: 12.9716,
              lng: 77.5946,
              plannedTime: new Date(baseTime.getTime() + 150 * 60 * 1000).toISOString(),
            },
          ],
          vehicles: [
            {
              id: 'VH3',
              requestedVehicleTypeId: 'VT2',
              vehicleId: 'VH3',
              driverId: 'D3',
              status: 'PENDING' as const,
              pax: [{ id: 'PAX3', name: 'Anand Rao', phone: '9876543212' }],
              lockedPrice: 3800000,
              lockedRateCardVersion: 1,
            },
          ],
          schedule: { type: 'ONE_OFF' as const, when: baseTime.toISOString() },
          status: 'CONFIRMED' as const,
          autoAssign: false,
          reference: 'BOOKING-003',
          createdAt: baseTime.toISOString(),
        },
      ];

      setTrips(trips as any);
    },
  };
}

function useAddSafetyAlertSeed() {
  const addSafetyAlert = useSafetyAlertStore((s) => s.addSafetyAlert);

  return {
    addSafetyAlertSeed: () => {
      const now = new Date();
      const baseTime = new Date(now.getTime() - 8 * 60 * 1000); // 8 minutes ago

      const alerts = [
        {
          id: 'ALERT-SOS-001',
          type: 'SOS' as const,
          status: 'ACTIVE' as const,
          tripId: 'RIDE-SEED-001',
          vehicleId: 'VH1',
          driverId: 'D1',
          message: 'Driver initiated SOS request',
          location: 'Mekhri Circle, Bangalore',
          severity: 'HIGH' as const,
          createdAt: baseTime.toISOString(),
          escalationLevel: 3 as const,
          tenantId: 'T1',
          paxName: 'Anil K***a',
          vehiclePlate: 'KA-05-CH-1122',
          timeline: [
            { level: 1, label: 'Driver notified', actor: 'System', status: 'done', timestamp: baseTime.toISOString() },
            { level: 2, label: 'Rajesh (Dispatcher)', actor: 'Rajesh', status: 'done', timestamp: new Date(baseTime.getTime() + 60000).toISOString() },
            { level: 3, label: 'Preethi (SPOC)', actor: 'Pending', status: 'active' },
            { level: 4, label: 'Authorities', actor: 'Pending', status: 'pending' },
          ],
        },
        {
          id: 'ALERT-DEVIATION-001',
          type: 'ROUTE_DEVIATION' as const,
          status: 'ACTIVE' as const,
          tripId: 'RIDE-SEED-002',
          vehicleId: 'VH2',
          message: 'Vehicle deviated 300m from expected route',
          location: 'Whitefield, Bangalore',
          severity: 'MEDIUM' as const,
          createdAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
          escalationLevel: 1 as const,
          tenantId: 'T1',
          vehiclePlate: 'KA-05-CH-1123',
          deviationMeters: 300,
          timeline: [
            { level: 1, label: 'Deviation detected', actor: 'System', status: 'active' },
          ],
        },
        {
          id: 'ALERT-NOSHOW-001',
          type: 'NO_SHOW' as const,
          status: 'ACTIVE' as const,
          tripId: 'RIDE-SEED-003',
          vehicleId: 'VH3',
          driverId: 'D3',
          message: 'Passenger no-show at pickup point',
          location: 'Electronic City Phase 1',
          severity: 'HIGH' as const,
          createdAt: new Date(now.getTime() - 8 * 60 * 1000).toISOString(),
          escalationLevel: 2 as const,
          tenantId: 'T1',
          paxName: 'Anand R***o',
          vehiclePlate: 'KA-05-CH-1124',
          stopDuration: 8,
          timeline: [
            { level: 1, label: 'Passenger waited', actor: 'Driver', status: 'done', timestamp: new Date(now.getTime() - 8 * 60 * 1000).toISOString() },
            { level: 2, label: 'No-show confirmed', actor: 'System', status: 'active' },
          ],
        },
      ];

      alerts.forEach((alert) => {
        addSafetyAlert(alert as any);
      });
    },
  };
}
