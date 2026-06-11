'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useVendorStore, useVehicleTypeStore } from '@ride/shared';
import { useCustomerStore } from '@/stores/customerStore';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { LayoutList, Plus, TrendingUp, Zap } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function RateManagerPage() {
  const router = useRouter();
  const [selectedRateCard, setSelectedRateCard] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [basisFilter, setBasisFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'superseded' | 'all'>('active');
  const [searchId, setSearchId] = useState('');

  const rateCards = useRateCardStore((s) => s.rateCards);
  const getRateCardById = useRateCardStore((s) => s.getRateCardById);
  const vendors = useVendorStore((s) => s.vendors);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);

  const tenantId = 'T1';
  const tenantRateCards = rateCards.filter((r) => r.tenantId === tenantId);

  // Determine which rate cards are active (highest version for each vendor×customer×vehicleType)
  const activeCardIds = new Set<string>();
  const cardsByCombo = new Map<string, any[]>();

  tenantRateCards.forEach((rc) => {
    const key = `${rc.vendorId}×${rc.customerId}×${rc.vehicleTypeId}`;
    if (!cardsByCombo.has(key)) {
      cardsByCombo.set(key, []);
    }
    cardsByCombo.get(key)!.push(rc);
  });

  cardsByCombo.forEach((cards) => {
    cards.sort((a, b) => b.version - a.version);
    if (cards.length > 0) {
      const today = new Date().toISOString().split('T')[0] || '';
      const active = cards.find((c) => c.validFrom <= today && (!c.validTo || c.validTo >= today));
      if (active) {
        activeCardIds.add(active.id);
      }
    }
  });

  const filtered = useMemo(() => {
    return tenantRateCards.filter((rc) => {
      if (vendorFilter && rc.vendorId !== vendorFilter) return false;
      if (vehicleTypeFilter && rc.vehicleTypeId !== vehicleTypeFilter) return false;
      if (basisFilter && rc.basis !== basisFilter) return false;
      if (searchId && !rc.id.toLowerCase().includes(searchId.toLowerCase())) return false;

      if (statusFilter === 'active' && !activeCardIds.has(rc.id)) return false;
      if (statusFilter === 'superseded' && activeCardIds.has(rc.id)) return false;

      return true;
    });
  }, [tenantRateCards, vendorFilter, vehicleTypeFilter, basisFilter, searchId, statusFilter, activeCardIds]);

  const activeCards = tenantRateCards.filter((r) => activeCardIds.has(r.id));
  const uniqueVendors = new Set(activeCards.map((r) => r.vendorId)).size;
  const uniqueVehicleTypes = new Set(activeCards.map((r) => r.vehicleTypeId)).size;
  const perKmCards = activeCards.filter((r) => r.basis === 'PER_KM');
  const avgPerKmRate = perKmCards.length > 0 ? Math.round(perKmCards.reduce((sum, r) => sum + (r.perKm || 0), 0) / perKmCards.length) : 0;

  const columns: Column<any>[] = [
    { key: 'id', label: 'ID', sortable: true, render: (v) => <span className="font-mono text-xs">{v}</span> },
    {
      key: 'vendorId',
      label: 'Vendor',
      render: (v) => vendors.find((ve) => ve.id === v)?.name || 'Unknown',
    },
    {
      key: 'vehicleTypeId',
      label: 'Vehicle Type',
      render: (v) => vehicleTypes.find((vt) => vt.id === v)?.name || 'Unknown',
    },
    { key: 'basis', label: 'Basis', sortable: true },
    {
      key: 'id',
      label: 'Rate',
      render: (v, row) => {
        const card = getRateCardById(v);
        if (!card) return '—';
        switch (card.basis) {
          case 'PER_KM':
            return `₹${(card.perKm || 0) / 100}/km`;
          case 'HOURLY':
            return `₹${(card.hourlyRate || 0) / 100}/hr`;
          case 'FIXED_LOCATION_PAIR':
            return 'Fixed pair';
          case 'PACKAGE':
            return `₹${(card.package?.price || 0) / 100}`;
          default:
            return '—';
        }
      },
    },
    {
      key: 'id',
      label: 'Modifiers',
      render: (v) => {
        const card = getRateCardById(v);
        if (!card || !card.modifiers) return '—';
        const badges = [];
        if (card.modifiers.nightCharge) badges.push(`Night +${card.modifiers.nightCharge}%`);
        if (card.modifiers.waitingPerHour) badges.push(`Wait ₹${card.modifiers.waitingPerHour / 100}/hr`);
        if (card.modifiers.minFare) badges.push(`Min ₹${card.modifiers.minFare / 100}`);
        return badges.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {badges.map((b, i) => (
              <Badge key={i} variant="default" className="text-xs px-2 py-1">
                {b}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        );
      },
    },
    { key: 'validFrom', label: 'Valid from', render: (v) => formatDate(v), sortable: true },
    { key: 'validTo', label: 'Valid to', render: (v) => (v ? formatDate(v) : 'Indefinite') },
    { key: 'version', label: 'Version', sortable: true, render: (v) => `v${v}` },
    {
      key: 'id',
      label: 'Status',
      render: (v) => (
        <Badge variant={activeCardIds.has(v) ? 'green' : 'default'}>
          {activeCardIds.has(v) ? 'Active' : 'Superseded'}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (v) => (
        <div className="flex gap-2">
          <button onClick={() => setSelectedRateCard(v)} className="text-[#2563EB] hover:underline text-sm font-medium">
            View
          </button>
          {activeCardIds.has(v) && (
            <button
              onClick={() => router.push(`/rate-manager/create?from=${v}`)}
              className="text-[#2563EB] hover:underline text-sm font-medium"
            >
              New version
            </button>
          )}
        </div>
      ),
    },
  ];

  const selectedCard = selectedRateCard ? getRateCardById(selectedRateCard) : null;
  const relatedVersions = selectedCard
    ? tenantRateCards.filter(
        (r) =>
          r.vendorId === selectedCard.vendorId &&
          r.customerId === selectedCard.customerId &&
          r.vehicleTypeId === selectedCard.vehicleTypeId
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">Rate Cards</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">Pre-negotiated rates</p>
        </div>
        <Button onClick={() => router.push('/rate-manager/create')}>
          <Plus className="w-4 h-4 mr-2 inline" /> New rate card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Active cards" value={activeCards.length} icon={<LayoutList />} />
        <KpiCard label="Vendors covered" value={uniqueVendors} icon={<Zap />} />
        <KpiCard label="Vehicle types" value={uniqueVehicleTypes} icon={<Zap />} />
        <KpiCard label="Avg ₹/km rate" value={avgPerKmRate / 100} unit="₹" icon={<TrendingUp />} />
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

          <select
            value={basisFilter}
            onChange={(e) => setBasisFilter(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="">All bases</option>
            <option value="PER_KM">Per KM</option>
            <option value="HOURLY">Hourly</option>
            <option value="FIXED_LOCATION_PAIR">Fixed pair</option>
            <option value="PACKAGE">Package</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="active">Active</option>
            <option value="superseded">Superseded</option>
            <option value="all">All</option>
          </select>

          <input
            type="text"
            placeholder="Search ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm flex-1 min-w-40"
          />
        </div>
      </Card>

      <Card header={`Rate cards (${filtered.length})`}>
        <DataTable columns={columns} data={filtered} rowKey="id" pageSize={20} />
      </Card>

      <Drawer isOpen={!!selectedCard} onClose={() => setSelectedRateCard(null)} title={selectedCard?.id} side="right">
        {selectedCard && (
          <div className="space-y-6">
            <div className="space-y-3">
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
                      <span className="text-[#8B8FA8]">Night charge:</span> {selectedCard.modifiers.nightCharge}%
                      {selectedCard.modifiers.nightStartHour && ` (${selectedCard.modifiers.nightStartHour}:00 - ${selectedCard.modifiers.nightEndHour}:00)`}
                    </div>
                  )}
                  {selectedCard.modifiers.waitingPerHour && (
                    <div className="text-xs">
                      <span className="text-[#8B8FA8]">Waiting:</span> ₹${selectedCard.modifiers.waitingPerHour / 100}/hr
                      {selectedCard.modifiers.freeWaitingMinutes && ` (${selectedCard.modifiers.freeWaitingMinutes} min free)`}
                    </div>
                  )}
                  {selectedCard.modifiers.tollHandling && (
                    <div className="text-xs">
                      <span className="text-[#8B8FA8]">Toll:</span> {selectedCard.modifiers.tollHandling}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Valid from</p>
                <p className="text-sm font-medium text-[#1B2A4A]">{formatDate(selectedCard.validFrom)}</p>
              </div>

              {selectedCard.validTo && (
                <div>
                  <p className="text-xs text-[#8B8FA8] mb-1">Valid to</p>
                  <p className="text-sm font-medium text-[#1B2A4A]">{formatDate(selectedCard.validTo)}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">Version</p>
                <p className="text-sm font-medium text-[#1B2A4A]">v{selectedCard.version}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-[#8B8FA8] mb-3 font-semibold">Version history</p>
              <div className="space-y-2">
                {relatedVersions.sort((a, b) => b.version - a.version).map((rc) => (
                  <div key={rc.id} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-semibold">v{rc.version}</span>
                      <Badge variant={activeCardIds.has(rc.id) ? 'green' : 'default'} className="text-xs">
                        {activeCardIds.has(rc.id) ? 'Active' : 'Superseded'}
                      </Badge>
                    </div>
                    <p className="text-[#8B8FA8]">Valid from {formatDate(rc.validFrom)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-[#8B8FA8] italic">
                Price lock: fare frozen at quote — never recalculated
              </p>
            </div>

            {activeCardIds.has(selectedCard.id) && (
              <Button onClick={() => router.push(`/rate-manager/create?from=${selectedCard.id}`)}>
                Create new version
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
