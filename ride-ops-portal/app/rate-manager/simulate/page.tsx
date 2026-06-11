'use client';

import React, { useState, useMemo } from 'react';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useVendorStore, useVehicleTypeStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { computeFare } from '@/lib/computeFare';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SimulationHistory {
  id: string;
  timestamp: string;
  vendorId: string;
  vehicleTypeId: string;
  distance: number;
  hours: number;
  waiting: number;
  isNight: boolean;
  total: number;
}

export default function SimulatePage() {
  const [vendorId, setVendorId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripTime, setTripTime] = useState('14:00');
  const [distanceKm, setDistanceKm] = useState('25');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [waitingMinutes, setWaitingMinutes] = useState('0');
  const [tollApplicable, setTollApplicable] = useState(false);
  const [history, setHistory] = useState<SimulationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const rateCards = useRateCardStore((s) => s.rateCards);
  const getApplicableRateCard = useRateCardStore((s) => s.getApplicableRateCard);
  const vendors = useVendorStore((s) => s.vendors);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const addToast = useToastStore((s) => s.addToast);

  const tenantId = 'T1';

  // Determine if night
  const [hourStr] = tripTime.split(':');
  const hour = Number(hourStr);
  const isNight = hour >= 22 || hour < 6;

  // Get applicable rate card
  const applicableRateCard = useMemo(() => {
    if (!vendorId || !vehicleTypeId) return null;

    // Find matching rate card based on current trip date
    const rateCard = getApplicableRateCard(tenantId, vendorId, '', vehicleTypeId, tripDate);
    return rateCard;
  }, [vendorId, vehicleTypeId, tripDate, getApplicableRateCard]);

  // Compute fare
  const fare = useMemo(() => {
    if (!applicableRateCard) return null;

    try {
      return computeFare({
        rateCard: applicableRateCard,
        distanceKm: Number(distanceKm),
        hours: Number(hours) + Number(minutes) / 60,
        isNight,
        waitingMinutes: Number(waitingMinutes),
        tollApplicable,
      });
    } catch (e) {
      return null;
    }
  }, [applicableRateCard, distanceKm, hours, minutes, isNight, waitingMinutes, tollApplicable]);

  const handleSaveHistory = () => {
    if (!fare || !applicableRateCard) return;

    const newEntry: SimulationHistory = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      vendorId,
      vehicleTypeId,
      distance: Number(distanceKm),
      hours: Number(hours) + Number(minutes) / 60,
      waiting: Number(waitingMinutes),
      isNight,
      total: fare.total,
    };

    setHistory([newEntry, ...history.slice(0, 9)]);
    addToast({ type: 'success', message: 'Simulation saved to history', duration: 2000 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Fare Simulator</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Test and validate rate cards</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Inputs */}
        <Card header="Inputs">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Vendor *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
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
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Vehicle Type *</label>
              <select
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              >
                <option value="">Select vehicle type</option>
                {vehicleTypes.filter((vt) => vt.tenantId === tenantId).map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Trip date & time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
                <input
                  type="time"
                  value={tripTime}
                  onChange={(e) => setTripTime(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
              {isNight && <p className="text-xs text-orange-600 mt-1">Night trip detected</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Hours"
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Waiting time (minutes)</label>
              <input
                type="number"
                min="0"
                value={waitingMinutes}
                onChange={(e) => setWaitingMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tollApplicable} onChange={(e) => setTollApplicable(e.target.checked)} />
              <span className="text-sm">Toll applicable</span>
            </label>
          </div>
        </Card>

        {/* Right Panel - Results */}
        <div className="space-y-4">
          {!fare ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-[#8B8FA8]">
                <p className="text-sm">No rate card found for this combination</p>
              </div>
            </Card>
          ) : (
            <Card header={`Simulated fare — ${applicableRateCard?.id} v${applicableRateCard?.version}`}>
              <div className="space-y-4">
                <div className="space-y-2 border-b pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8B8FA8]">Base fare</span>
                    <span className="font-medium">₹{fare.baseFare / 100}</span>
                  </div>
                  {fare.nightSurcharge > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Night surcharge</span>
                      <span>+ ₹{fare.nightSurcharge / 100}</span>
                    </div>
                  )}
                  {fare.waitingCharge > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Waiting charge</span>
                      <span>+ ₹{fare.waitingCharge / 100}</span>
                    </div>
                  )}
                  {fare.tollCharge > 0 && (
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Toll</span>
                      <span>+ ₹{fare.tollCharge / 100}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-[#2563EB]">₹{fare.total / 100}</span>
                </div>

                {fare.isApproximate && <p className="text-xs text-[#8B8FA8] italic">* Approximate (fixed pair rate)</p>}

                <div className="text-xs text-[#8B8FA8] space-y-1 pt-2 border-t">
                  <p>Valid: {applicableRateCard?.validFrom} → {applicableRateCard?.validTo || 'indefinite'}</p>
                  <p className="italic">This is a simulation — no trip created</p>
                </div>

                <Button onClick={handleSaveHistory} variant="secondary" className="w-full">
                  Save to history
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card
          header={
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full"
            >
              <span>Simulation history ({history.length})</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          }
        >
          {showHistory && (
            <div className="space-y-2">
              {history.map((entry) => {
                const vendor = vendors.find((v) => v.id === entry.vendorId);
                const vehicleType = vehicleTypes.find((vt) => vt.id === entry.vehicleTypeId);
                return (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm">
                    <div>
                      <p className="font-medium text-[#1B2A4A]">
                        {vendor?.name} × {vehicleType?.name}
                      </p>
                      <p className="text-xs text-[#8B8FA8]">
                        {entry.distance}km, {Math.floor(entry.hours)}h {Math.round((entry.hours % 1) * 60)}m, {entry.waiting}min wait
                        {entry.isNight && ' · Night'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2563EB]">₹{entry.total / 100}</p>
                      <p className="text-xs text-[#8B8FA8]">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
