'use client';

import React, { useState, useMemo } from 'react';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useVendorStore, useVehicleTypeStore } from '@ride/shared';
import { useCustomerStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const [selectedRateCard, setSelectedRateCard] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const rateCards = useRateCardStore((s) => s.rateCards);
  const getRateCardById = useRateCardStore((s) => s.getRateCardById);
  const vendors = useVendorStore((s) => s.vendors);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const customers = useCustomerStore((s) => s.customers);

  const tenantId = 'T1';
  const tenantRateCards = rateCards.filter((r) => r.tenantId === tenantId);

  // Group by vendor×customer×vehicleType
  const grouped = useMemo(() => {
    const groups = new Map<string, any[]>();

    tenantRateCards.forEach((rc) => {
      const key = `${rc.vendorId}×${rc.customerId}×${rc.vehicleTypeId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(rc);
    });

    // Sort each group by version descending
    groups.forEach((cards) => {
      cards.sort((a, b) => b.version - a.version);
    });

    return Array.from(groups.entries());
  }, [tenantRateCards]);

  // Filter groups
  const filtered = useMemo(() => {
    return grouped.filter(([key, cards]) => {
      const [vendorId, customerId, vehicleTypeId] = key.split('×');
      if (vendorFilter && vendorId !== vendorFilter) return false;
      if (vehicleTypeFilter && vehicleTypeId !== vehicleTypeFilter) return false;

      if (dateFrom || dateTo) {
        const anyInRange = cards.some((c) => {
          const cDate = c.validFrom;
          if (dateFrom && cDate < dateFrom) return false;
          if (dateTo && cDate > dateTo) return false;
          return true;
        });
        if (!anyInRange) return false;
      }

      return true;
    });
  }, [grouped, vendorFilter, vehicleTypeFilter, dateFrom, dateTo]);

  const selectedCard = selectedRateCard ? getRateCardById(selectedRateCard) : null;

  // Determine active version for display
  const activeCardIds = new Set<string>();
  const today = new Date().toISOString().split('T')[0] || '';
  grouped.forEach(([_, cards]) => {
    cards.sort((a, b) => b.version - a.version);
    const active = cards.find((c) => c.validFrom <= today && (!c.validTo || c.validTo >= today));
    if (active) activeCardIds.add(active.id);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Version History</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">All rate card versions and changes</p>
      </div>

      <Card header="Filters">
        <div className="flex flex-wrap gap-4">
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="">All vendors</option>
            {Array.from(new Set(tenantRateCards.map((r) => r.vendorId))).map((vid) => (
              <option key={vid} value={vid}>
                {vendors.find((v) => v.id === vid)?.name || 'Unknown'}
              </option>
            ))}
          </select>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="">All vehicle types</option>
            {Array.from(new Set(tenantRateCards.map((r) => r.vehicleTypeId))).map((vtid) => (
              <option key={vtid} value={vtid}>
                {vehicleTypes.find((vt) => vt.id === vtid)?.name || 'Unknown'}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-[#8B8FA8] py-8">No rate cards match the filters</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(([key, cards]) => {
            const [vendorId, customerId, vehicleTypeId] = key.split('×');
            const vendor = vendors.find((v) => v.id === vendorId);
            const vehicleType = vehicleTypes.find((vt) => vt.id === vehicleTypeId);
            const customer = customers.find((c) => c.id === customerId);

            return (
              <Card key={key} header={`${vendor?.name} × ${vehicleType?.name} × ${customer?.code}`}>
                <div className="space-y-3">
                  {cards.map((rc, idx) => {
                    const nextVersion = idx > 0 ? cards[idx - 1] : null;
                    const isActive = activeCardIds.has(rc.id);

                    return (
                      <div key={rc.id} className="flex justify-between items-start p-3 bg-gray-50 rounded border border-[#E0E0E0]">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Badge className="font-mono">v{rc.version}</Badge>
                            <Badge variant={isActive ? 'green' : 'default'}>
                              {isActive ? 'Active' : nextVersion ? `Superseded on ${formatDate(nextVersion.validFrom)}` : 'Old'}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#8B8FA8]">Valid from {formatDate(rc.validFrom)}</p>
                        </div>
                        <button
                          onClick={() => setSelectedRateCard(rc.id)}
                          className="text-[#2563EB] hover:underline text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer isOpen={!!selectedCard} onClose={() => setSelectedRateCard(null)} title={selectedCard?.id} side="right">
        {selectedCard && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#8B8FA8] mb-1">Basis</p>
              <p className="text-sm font-medium text-[#1B2A4A]">{selectedCard.basis}</p>
            </div>

            {selectedCard.basis === 'PER_KM' && selectedCard.perKm && (
              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Rate</p>
                <p className="text-sm font-medium text-[#1B2A4A]">₹{selectedCard.perKm / 100}/km</p>
              </div>
            )}

            {selectedCard.basis === 'HOURLY' && selectedCard.hourlyRate && (
              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Rate</p>
                <p className="text-sm font-medium text-[#1B2A4A]">₹{selectedCard.hourlyRate / 100}/hour</p>
              </div>
            )}

            {selectedCard.modifiers && (
              <div className="p-3 bg-gray-50 rounded space-y-2">
                <p className="text-xs font-semibold text-[#1B2A4A] mb-2">Modifiers</p>
                {selectedCard.modifiers.minFare && (
                  <div className="text-xs">
                    <span className="text-[#8B8FA8]">Min fare:</span> ₹{selectedCard.modifiers.minFare / 100}
                  </div>
                )}
                {selectedCard.modifiers.nightCharge && (
                  <div className="text-xs">
                    <span className="text-[#8B8FA8]">Night surcharge:</span> {selectedCard.modifiers.nightCharge}%
                  </div>
                )}
                {selectedCard.modifiers.waitingPerHour && (
                  <div className="text-xs">
                    <span className="text-[#8B8FA8]">Waiting:</span> ₹{selectedCard.modifiers.waitingPerHour / 100}/hr
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4 text-xs text-[#8B8FA8]">
              Old versions preserved for audit — cannot be deleted
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
