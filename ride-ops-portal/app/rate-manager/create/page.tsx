'use client';

import { Suspense } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRateCardStore, RateBasis, RateCard } from '@/stores/rateCardStore';
import { useVendorStore, useVehicleTypeStore } from '@ride/shared';
import { useCustomerStore } from '@ride/shared';
import { useToastStore } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SupersedeModal } from '@/components/rate-manager/SupersedeModal';
import { computeFare } from '@/lib/computeFare';

function CreateVersionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get('from');

  const [scope, setScope] = useState({
    vendorId: '',
    customerId: '',
    vehicleTypeId: '',
    validFrom: '',
    validTo: '',
  });

  const [basis, setBasis] = useState<RateBasis>('PER_KM');
  const [pricing, setPricing] = useState({
    perKm: '',
    hourlyRate: '',
    fixedPairs: [] as any[],
    packageRate: null as any,
  });

  const [modifiers, setModifiers] = useState({
    minFare: '',
    nightCharge: '',
    nightStartHour: '22',
    nightEndHour: '6',
    waitingPerHour: '',
    freeWaitingMinutes: '10',
    tollHandling: 'INCLUDED' as 'INCLUDED' | 'EXTRA',
    parkingHandling: 'INCLUDED' as 'INCLUDED' | 'EXTRA',
    interStateSurcharge: '',
    deadMileagePerKm: '',
  });

  const [showSupersedeModal, setShowSupersedeModal] = useState(false);
  const [existingRateCard, setExistingRateCard] = useState<RateCard | undefined>();
  const [loading, setLoading] = useState(false);

  const addRateCard = useRateCardStore((s) => s.addRateCard);
  const createNewVersion = useRateCardStore((s) => s.createNewVersion);
  const getRateCardById = useRateCardStore((s) => s.getRateCardById);
  const getApplicableRateCard = useRateCardStore((s) => s.getApplicableRateCard);
  const addAuditEntry = useRateCardStore((s) => s.addAuditEntry);

  const vendors = useVendorStore((s) => s.vendors);
  const customers = useCustomerStore((s) => s.customers);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const addToast = useToastStore((s) => s.addToast);

  // Load existing rate card if editing
  useEffect(() => {
    if (fromId) {
      const original = getRateCardById(fromId);
      if (original) {
        const today = new Date().toISOString().split('T')[0] || '';
        setScope({
          vendorId: original.vendorId,
          customerId: original.customerId,
          vehicleTypeId: original.vehicleTypeId,
          validFrom: today,
          validTo: '',
        });
        setBasis(original.basis);
        setPricing({
          perKm: original.perKm ? String(original.perKm) : '',
          hourlyRate: original.hourlyRate ? String(original.hourlyRate) : '',
          fixedPairs: original.fixedPairs || [],
          packageRate: original.package || null,
        });
        if (original.modifiers) {
          setModifiers({
            minFare: original.modifiers.minFare ? String(original.modifiers.minFare) : '',
            nightCharge: original.modifiers.nightCharge ? String(original.modifiers.nightCharge) : '',
            nightStartHour: String(original.modifiers.nightStartHour || 22),
            nightEndHour: String(original.modifiers.nightEndHour || 6),
            waitingPerHour: original.modifiers.waitingPerHour ? String(original.modifiers.waitingPerHour) : '',
            freeWaitingMinutes: String(original.modifiers.freeWaitingMinutes || 10),
            tollHandling: original.modifiers.tollHandling || 'INCLUDED',
            parkingHandling: original.modifiers.parkingHandling || 'INCLUDED',
            interStateSurcharge: original.modifiers.interStateSurcharge ? String(original.modifiers.interStateSurcharge) : '',
            deadMileagePerKm: original.modifiers.deadMileagePerKm ? String(original.modifiers.deadMileagePerKm) : '',
          });
        }
      }
    } else {
      const today = new Date().toISOString().split('T')[0] || '';
      setScope((s) => ({ ...s, validFrom: today }));
    }
  }, [fromId, getRateCardById]);

  const tenantId = 'T1';
  const tenantCustomers = customers.filter((c) => c.tenantId === tenantId);
  const tenantVehicleTypes = vehicleTypes.filter((vt) => vt.tenantId === tenantId);

  // Live preview
  const sampleFare = useMemo(() => {
    if (!basis || !scope.vendorId) return null;

    const fareInput = {
      rateCard: {
        id: 'sample',
        tenantId,
        vendorId: scope.vendorId,
        customerId: scope.customerId,
        vehicleTypeId: scope.vehicleTypeId,
        basis,
        perKm: pricing.perKm ? Number(pricing.perKm) : undefined,
        hourlyRate: pricing.hourlyRate ? Number(pricing.hourlyRate) : undefined,
        fixedPairs: pricing.fixedPairs,
        package: pricing.packageRate,
        modifiers: {
          minFare: modifiers.minFare ? Number(modifiers.minFare) : undefined,
          nightCharge: modifiers.nightCharge ? Number(modifiers.nightCharge) : undefined,
          nightStartHour: modifiers.nightStartHour ? Number(modifiers.nightStartHour) : undefined,
          nightEndHour: modifiers.nightEndHour ? Number(modifiers.nightEndHour) : undefined,
          waitingPerHour: modifiers.waitingPerHour ? Number(modifiers.waitingPerHour) : undefined,
          freeWaitingMinutes: modifiers.freeWaitingMinutes ? Number(modifiers.freeWaitingMinutes) : 10,
          tollHandling: modifiers.tollHandling,
          parkingHandling: modifiers.parkingHandling,
          interStateSurcharge: modifiers.interStateSurcharge ? Number(modifiers.interStateSurcharge) : undefined,
          deadMileagePerKm: modifiers.deadMileagePerKm ? Number(modifiers.deadMileagePerKm) : undefined,
        },
        validFrom: scope.validFrom,
        version: 1,
        createdAt: new Date().toISOString(),
      },
      distanceKm: 25,
      hours: 0.5,
      isNight: true,
      waitingMinutes: 30,
      tollApplicable: false,
    };

    try {
      return computeFare(fareInput);
    } catch (e) {
      return null;
    }
  }, [basis, scope, pricing, modifiers, tenantId]);

  const handleSave = async () => {
    // Validate required fields
    if (!scope.vendorId || !scope.customerId || !scope.vehicleTypeId || !scope.validFrom) {
      addToast({ type: 'error', message: 'Fill all scope fields', duration: 3000 });
      return;
    }

    if (basis === 'PER_KM' && !pricing.perKm) {
      addToast({ type: 'error', message: 'Enter ₹/km rate', duration: 3000 });
      return;
    }

    if (basis === 'HOURLY' && !pricing.hourlyRate) {
      addToast({ type: 'error', message: 'Enter ₹/hour rate', duration: 3000 });
      return;
    }

    setLoading(true);

    try {
      // Check for existing rate card to supersede
      const existing = getApplicableRateCard(tenantId, scope.vendorId, scope.customerId, scope.vehicleTypeId);

      if (existing && fromId !== existing.id) {
        setExistingRateCard(existing);
        setShowSupersedeModal(true);
        setLoading(false);
        return;
      }

      // Build rate card
      const newRateCard = {
        tenantId,
        vendorId: scope.vendorId,
        customerId: scope.customerId,
        vehicleTypeId: scope.vehicleTypeId,
        basis: basis as RateBasis,
        perKm: basis === 'PER_KM' ? Number(pricing.perKm) : undefined,
        hourlyRate: basis === 'HOURLY' ? Number(pricing.hourlyRate) : undefined,
        fixedPairs: basis === 'FIXED_LOCATION_PAIR' ? pricing.fixedPairs : undefined,
        package: basis === 'PACKAGE' ? pricing.packageRate : undefined,
        modifiers: {
          minFare: modifiers.minFare ? Number(modifiers.minFare) : undefined,
          nightCharge: modifiers.nightCharge ? Number(modifiers.nightCharge) : undefined,
          nightStartHour: modifiers.nightStartHour ? Number(modifiers.nightStartHour) : undefined,
          nightEndHour: modifiers.nightEndHour ? Number(modifiers.nightEndHour) : undefined,
          waitingPerHour: modifiers.waitingPerHour ? Number(modifiers.waitingPerHour) : undefined,
          freeWaitingMinutes: modifiers.freeWaitingMinutes ? Number(modifiers.freeWaitingMinutes) : 10,
          tollHandling: modifiers.tollHandling,
          parkingHandling: modifiers.parkingHandling,
          interStateSurcharge: modifiers.interStateSurcharge ? Number(modifiers.interStateSurcharge) : undefined,
          deadMileagePerKm: modifiers.deadMileagePerKm ? Number(modifiers.deadMileagePerKm) : undefined,
        },
        validFrom: scope.validFrom,
        validTo: scope.validTo || undefined,
        version: 1,
      };

      let rcId: string;
      if (fromId) {
        rcId = createNewVersion(fromId, newRateCard);
      } else {
        rcId = addRateCard(newRateCard as any);
        addAuditEntry({
          timestamp: new Date().toISOString(),
          action: 'CREATED',
          rateCardId: rcId,
          vendorId: scope.vendorId,
          vehicleTypeId: scope.vehicleTypeId,
          customerId: scope.customerId,
          newRate: newRateCard as any,
          version: 1,
        });
      }

      addToast({ type: 'success', message: `Rate card saved successfully`, duration: 3000 });
      router.push('/rate-manager');
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to save rate card', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const confirmSupersede = () => {
    setShowSupersedeModal(false);
    handleSave();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{fromId ? 'Create New Version' : 'Create Rate Card'}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Define pricing and modifiers</p>
      </div>

      {/* Scope */}
      <Card header="Scope">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="vendorId">Vendor *</label>
            <select
              id="vendorId"
              value={scope.vendorId}
              onChange={(e) => setScope({ ...scope, vendorId: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="customerId">Customer *</label>
            <select
              id="customerId"
              value={scope.customerId}
              onChange={(e) => setScope({ ...scope, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            >
              <option value="">Select customer</option>
              {tenantCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="vehicleTypeId">Vehicle Type *</label>
            <select
              id="vehicleTypeId"
              value={scope.vehicleTypeId}
              onChange={(e) => setScope({ ...scope, vehicleTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            >
              <option value="">Select vehicle type</option>
              {tenantVehicleTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="validFrom">Valid from *</label>
            <input
              id="validFrom"
              type="date"
              value={scope.validFrom}
              onChange={(e) => setScope({ ...scope, validFrom: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="validTo">Valid to</label>
            <input
              id="validTo"
              type="date"
              value={scope.validTo}
              onChange={(e) => setScope({ ...scope, validTo: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Pricing Basis */}
      <Card header="Pricing basis">
        <div className="flex gap-6 mb-6">
          {(['PER_KM', 'HOURLY', 'FIXED_LOCATION_PAIR', 'PACKAGE'] as RateBasis[]).map((b) => (
            <label key={b} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="pricingBasis" value={b} checked={basis === b} onChange={(e) => setBasis(e.target.value as RateBasis)} />
              <span className="text-sm">{b === 'FIXED_LOCATION_PAIR' ? 'Fixed pair' : b === 'PER_KM' ? 'Per KM' : b}</span>
            </label>
          ))}
        </div>

        {basis === 'PER_KM' && (
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="perKm">₹/km *</label>
            <input
              id="perKm"
              type="number"
              step="1"
              value={pricing.perKm}
              onChange={(e) => setPricing({ ...pricing, perKm: e.target.value })}
              placeholder="e.g., 2000 for ₹20"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
            <p className="text-xs text-[#8B8FA8] mt-1">Enter in paise (₹20 = 2000)</p>
          </div>
        )}

        {basis === 'HOURLY' && (
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="hourlyRate">₹/hour *</label>
            <input
              id="hourlyRate"
              type="number"
              step="1"
              value={pricing.hourlyRate}
              onChange={(e) => setPricing({ ...pricing, hourlyRate: e.target.value })}
              placeholder="e.g., 50000 for ₹500"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
            <p className="text-xs text-[#8B8FA8] mt-1">Enter in paise (₹500 = 50000)</p>
          </div>
        )}
      </Card>

      {/* Modifiers */}
      <Card header="Modifiers">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="minFare">Minimum fare (paise)</label>
              <input
                id="minFare"
                type="number"
                value={modifiers.minFare}
                onChange={(e) => setModifiers({ ...modifiers, minFare: e.target.value })}
                placeholder="e.g., 20000 for ₹200"
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="nightCharge">Night surcharge (%)</label>
              <input
                id="nightCharge"
                type="number"
                value={modifiers.nightCharge}
                onChange={(e) => setModifiers({ ...modifiers, nightCharge: e.target.value })}
                placeholder="e.g., 25"
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            {modifiers.nightCharge && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="nightStartHour">Night start hour (0-23)</label>
                  <input
                    id="nightStartHour"
                    type="number"
                    min="0"
                    max="23"
                    value={modifiers.nightStartHour}
                    onChange={(e) => setModifiers({ ...modifiers, nightStartHour: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="nightEndHour">Night end hour (0-23)</label>
                  <input
                    id="nightEndHour"
                    type="number"
                    min="0"
                    max="23"
                    value={modifiers.nightEndHour}
                    onChange={(e) => setModifiers({ ...modifiers, nightEndHour: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="waitingPerHour">Waiting charge (paise/hr)</label>
              <input
                id="waitingPerHour"
                type="number"
                value={modifiers.waitingPerHour}
                onChange={(e) => setModifiers({ ...modifiers, waitingPerHour: e.target.value })}
                placeholder="e.g., 10000 for ₹100/hr"
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            {modifiers.waitingPerHour && (
              <div>
                <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="freeWaitingMinutes">Free waiting minutes</label>
                <input
                  id="freeWaitingMinutes"
                  type="number"
                  value={modifiers.freeWaitingMinutes}
                  onChange={(e) => setModifiers({ ...modifiers, freeWaitingMinutes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="tollHandling">Toll handling</label>
              <select
                id="tollHandling"
                value={modifiers.tollHandling}
                onChange={(e) => setModifiers({ ...modifiers, tollHandling: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              >
                <option value="INCLUDED">Included in base fare</option>
                <option value="EXTRA">Extra charge</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="parkingHandling">Parking handling</label>
              <select
                id="parkingHandling"
                value={modifiers.parkingHandling}
                onChange={(e) => setModifiers({ ...modifiers, parkingHandling: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              >
                <option value="INCLUDED">Included in base fare</option>
                <option value="EXTRA">Extra charge</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Preview */}
      {sampleFare && (
        <Card header="Live preview">
          <p className="text-xs text-[#8B8FA8] mb-4">Sample: 25km, 30min wait, 11PM departure (night)</p>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span>Base fare</span>
              <span>₹{sampleFare.baseFare / 100}</span>
            </div>
            {sampleFare.nightSurcharge > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Night surcharge</span>
                <span>+ ₹{sampleFare.nightSurcharge / 100}</span>
              </div>
            )}
            {sampleFare.waitingCharge > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Waiting charge</span>
                <span>+ ₹{sampleFare.waitingCharge / 100}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>₹{sampleFare.total / 100}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save rate card'}
        </Button>
      </div>

      <SupersedeModal
        isOpen={showSupersedeModal}
        oldRateCard={existingRateCard}
        newVersion={existingRateCard ? existingRateCard.version + 1 : 2}
        onClose={() => setShowSupersedeModal(false)}
        onConfirm={confirmSupersede}
      />
    </div>
  );
}

export default function CreateVersionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <CreateVersionPageContent />
    </Suspense>
  );
}
