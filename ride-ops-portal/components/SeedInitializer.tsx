'use client';

import { useEffect } from 'react';
import { useTripStore, useAlertStore, useSafetyAlertStore, useVendorStore, useVehicleTypeStore } from '@ride/shared';
import { useTenantStore } from '@/stores/tenantStore';
import { useTripStore as useLocalTripStore } from '@/stores/tripStore';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useCustomerStore } from '@/stores/customerStore';

export function SeedInitializer() {
  const trips = useTripStore((s) => s.trips);
  const alerts = useAlertStore((s) => s.alerts);
  const tenants = useTenantStore((s) => s.tenants);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const localTrips = useLocalTripStore((s) => s.trips);
  const customers = useCustomerStore((s) => s.customers);
  const rateCards = useRateCardStore((s) => s.rateCards);
  const vendors = useVendorStore((s) => s.vendors);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);

  const { addTripSeed } = useAddTripSeed();
  const { addSafetyAlertSeed } = useAddSafetyAlertSeed();
  const { seedRateManagerData } = useSeedRateManagerData();

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

  useEffect(() => {
    if (customers.length === 0 || rateCards.length === 0 || vehicleTypes.length === 0) {
      seedRateManagerData();
    }
  }, [customers.length, rateCards.length, vehicleTypes.length, seedRateManagerData]);

  const tripCount = localTrips.length;
  const alertCount = safetyAlerts.length;
  const tenantCount = tenants.length;
  const customerCount = customers.length;
  const rateCardCount = rateCards.length;

  return (
    <div className="fixed bottom-4 left-4 text-xs text-[#8B8FA8] bg-white border border-[#E0E0E0] rounded px-3 py-2 font-mono z-40">
      Trips: {tripCount} | Alerts: {alertCount} | Customers: {customerCount} | RateCards: {rateCardCount}
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

function useSeedRateManagerData() {
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const addRateCard = useRateCardStore((s) => s.addRateCard);
  const addAuditEntry = useRateCardStore((s) => s.addAuditEntry);
  const vendors = useVendorStore((s) => s.vendors);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);

  return {
    seedRateManagerData: () => {
      const tenantId = 'T1';
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Get first vendor from existing vendors (should be seeded globally)
      const vendor = vendors.length > 0 ? vendors[0] : null;
      if (!vendor) return;

      // Add customers
      const customerIds: { [key: string]: string } = {};
      const customerData = [
        { name: 'IndiGo Airlines', code: 'INDIGO', billingCycle: 'MONTHLY', tenantId, active: true },
        { name: 'Acme Logistics', code: 'ACME-LOG', billingCycle: 'FORTNIGHTLY', tenantId, active: true },
        { name: 'TechCorp India', code: 'TECHCORP', billingCycle: 'WEEKLY', tenantId, active: true },
      ];
      customerData.forEach((c) => {
        const id = addCustomer(c);
        customerIds[c.code] = id;
      });

      // Get first vehicle type (should be pre-seeded globally)
      const vt1 = vehicleTypes.find((vt) => vt.tenantId === tenantId);
      const vt2 = vehicleTypes.filter((vt) => vt.tenantId === tenantId)[1];
      if (!vt1) return;

      // Add rate cards
      const rateCardData = [
        {
          tenantId,
          vendorId: vendor.id,
          customerId: customerIds['INDIGO'],
          vehicleTypeId: vt1.id,
          basis: 'PER_KM' as const,
          perKm: 2000, // ₹20/km in paise
          modifiers: {
            minFare: 20000, // ₹200
            nightCharge: 25, // 25%
            nightStartHour: 22,
            nightEndHour: 6,
            waitingPerHour: 10000, // ₹100/hr
            freeWaitingMinutes: 10,
            tollHandling: 'EXTRA' as const,
          },
          validFrom: today,
          version: 1,
        },
        {
          tenantId,
          vendorId: vendor.id,
          customerId: customerIds['INDIGO'],
          vehicleTypeId: vt2?.id || vt1.id,
          basis: 'PER_KM' as const,
          perKm: 2500, // ₹25/km in paise
          modifiers: {
            minFare: 25000, // ₹250
          },
          validFrom: today,
          version: 1,
        },
        {
          tenantId,
          vendorId: vendor.id,
          customerId: customerIds['ACME-LOG'],
          vehicleTypeId: vt1.id,
          basis: 'HOURLY' as const,
          hourlyRate: 50000, // ₹500/hr
          modifiers: {
            minFare: 15000, // ₹150
          },
          validFrom: today,
          version: 1,
        },
      ];

      rateCardData.forEach((rc) => {
        const rcId = addRateCard(rc as any);
        addAuditEntry({
          timestamp: now.toISOString(),
          action: 'CREATED',
          rateCardId: rcId,
          vendorId: rc.vendorId,
          vehicleTypeId: rc.vehicleTypeId,
          customerId: rc.customerId,
          newRate: rc as any,
          version: 1,
        });
      });
    },
  };
}
