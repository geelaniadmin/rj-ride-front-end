'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore, t } from '@ride/shared';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useVendorStore, useVehicleTypeStore } from '@ride/shared';

import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { KpiCardSkeleton, DataTableSkeleton } from '@/components/ui/Skeleton';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { LayoutList, Plus, TrendingUp, Zap } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function RateManagerPage() {
  const language = useLanguageStore((s) => s.language);
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
    { key: 'id', label: t('id', language), sortable: true, render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'vendorId', label: t('vendor', language), render: (v) => vendors.find((ve) => ve.id === v)?.name || t('unknown', language) },
    { key: 'vehicleTypeId', label: t('vehicleType', language), render: (v) => vehicleTypes.find((vt) => vt.id === v)?.name || t('unknown', language) },
    { key: 'basis', label: t('basis', language), sortable: true },
    { key: 'id', label: t('rate', language), render: (v, row) => {
      const card = getRateCardById(v);
      if (!card) return t('dash', language);
      switch (card.basis) {
        case 'PER_KM': return `₹${(card.perKm || 0) / 100}/km`;
        case 'HOURLY': return `₹${(card.hourlyRate || 0) / 100}/hr`;
        case 'FIXED_LOCATION_PAIR': return t('fixedPair', language);
        case 'PACKAGE': return `₹${(card.package?.price || 0) / 100}`;
        default: return t('dash', language);
      }
    }},
    { key: 'id', label: t('modifiers', language), render: (v) => {
      const card = getRateCardById(v);
      if (!card || !card.modifiers) return t('dash', language);
      const badges = [];
      if (card.modifiers.nightCharge) badges.push(`${t('night', language)} +${card.modifiers.nightCharge}%`);
      if (card.modifiers.waitingPerHour) badges.push(`${t('waitLabel', language)} ₹${card.modifiers.waitingPerHour / 100}/hr`);
      if (card.modifiers.minFare) badges.push(`${t('minLabel', language)} ₹${card.modifiers.minFare / 100}`);
      return badges.length > 0 ? (
        <div className="flex gap-1 flex-wrap">
          {badges.map((b, i) => <Badge key={i} variant="default" className="text-xs px-2 py-1">{b}</Badge>)}
        </div>
      ) : t('dash', language);
    }},
    { key: 'validFrom', label: t('validFrom', language), render: (v) => formatDate(v), sortable: true },
    { key: 'validTo', label: t('validTo', language), render: (v) => (v ? formatDate(v) : t('indefinite', language)) },
    { key: 'version', label: t('version', language), sortable: true, render: (v) => `v${v}` },
    { key: 'id', label: t('status', language), render: (v) => <Badge variant={activeCardIds.has(v) ? 'green' : 'default'}>{activeCardIds.has(v) ? t('active', language) : t('superseded', language)}</Badge> },
    { key: 'id', label: t('actions', language), render: (v) => (
      <div className="flex gap-2">
        <button onClick={() => setSelectedRateCard(v)} className="text-[#2563EB] hover:underline text-sm font-medium">{t('view', language)}</button>
        {activeCardIds.has(v) && (
          <button onClick={() => router.push(`/rate-manager/create?from=${v}`)} className="text-[#2563EB] hover:underline text-sm font-medium">{t('newVersion', language)}</button>
        )}
      </div>
    )},
  ];

  const selectedCard = selectedRateCard ? getRateCardById(selectedRateCard) : null;
  const relatedVersions = selectedCard
    ? tenantRateCards.filter((r) => r.vendorId === selectedCard.vendorId && r.customerId === selectedCard.customerId && r.vehicleTypeId === selectedCard.vehicleTypeId)
    : [];

  const isLoading = tenantRateCards.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('rateCards', language)}</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">{t('preNegotiatedRates', language)}</p>
        </div>
        <Button onClick={() => router.push('/rate-manager/create')} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2 inline" /> {t('newRateCard', language)}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <KpiCard label={t('activeCards', language)} value={activeCards.length} icon={<LayoutList />} />
            <KpiCard label={t('vendorsCovered', language)} value={uniqueVendors} icon={<Zap />} />
            <KpiCard label={t('vehicleTypesLabel', language)} value={uniqueVehicleTypes} icon={<Zap />} />
            <KpiCard label={t('avgPerKmRate', language)} value={avgPerKmRate / 100} unit="₹" icon={<TrendingUp />} />
          </>
        )}
      </div>

      <Card header={t('filters', language)}>
        <div className="flex flex-wrap gap-4">
          <select name="vendorFilter" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="px-3 py-2 border border-[#E0E0E0] rounded text-sm">
            <option value="">{t('allVendors', language)}</option>
            {Array.from(new Set(tenantRateCards.map((r) => r.vendorId))).map((vid) => (
              <option key={vid} value={vid}>{vendors.find((v) => v.id === vid)?.name || t('unknown', language)}</option>
            ))}
          </select>
          <select name="vehicleTypeFilter" value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value)} className="px-3 py-2 border border-[#E0E0E0] rounded text-sm">
            <option value="">{t('allVehicleTypes', language)}</option>
            {Array.from(new Set(tenantRateCards.map((r) => r.vehicleTypeId))).map((vtid) => (
              <option key={vtid} value={vtid}>{vehicleTypes.find((vt) => vt.id === vtid)?.name || t('unknown', language)}</option>
            ))}
          </select>
          <select name="basisFilter" value={basisFilter} onChange={(e) => setBasisFilter(e.target.value)} className="px-3 py-2 border border-[#E0E0E0] rounded text-sm">
            <option value="">{t('allBases', language)}</option>
            <option value="PER_KM">{t('perKm', language)}</option>
            <option value="HOURLY">{t('hourly', language)}</option>
            <option value="FIXED_LOCATION_PAIR">{t('fixedPair', language)}</option>
            <option value="PACKAGE">{t('package', language)}</option>
          </select>
          <select name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border border-[#E0E0E0] rounded text-sm">
            <option value="active">{t('active', language)}</option>
            <option value="superseded">{t('superseded', language)}</option>
            <option value="all">{t('all', language)}</option>
          </select>
          <input type="text" name="searchId" placeholder={t('searchIdPlaceholder', language)} value={searchId} onChange={(e) => setSearchId(e.target.value)} className="px-3 py-2 border border-[#E0E0E0] rounded text-sm flex-1 min-w-40" />
        </div>
      </Card>

      <Card header={`${t('rateCards', language)} (${filtered.length})`}>
        {isLoading ? <DataTableSkeleton rows={5} /> : <DataTable columns={columns} data={filtered} rowKey="id" pageSize={20} />}
      </Card>

      <Drawer isOpen={!!selectedCard} onClose={() => setSelectedRateCard(null)} title={selectedCard?.id} side="right">
        {selectedCard && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#8B8FA8] mb-1">{t('basis', language)}</p>
                <p className="text-sm font-medium text-[#1B2A4A]">{selectedCard.basis}</p>
              </div>
              {selectedCard.basis === 'PER_KM' && selectedCard.perKm && (
                <div><p className="text-xs text-[#8B8FA8] mb-1">{t('rate', language)}</p><p className="text-sm font-medium text-[#1B2A4A]">₹{selectedCard.perKm / 100}/km</p></div>
              )}
              {selectedCard.basis === 'HOURLY' && selectedCard.hourlyRate && (
                <div><p className="text-xs text-[#8B8FA8] mb-1">{t('rate', language)}</p><p className="text-sm font-medium text-[#1B2A4A]">₹{selectedCard.hourlyRate / 100}/hour</p></div>
              )}
              {selectedCard.modifiers && (
                <div className="p-3 bg-gray-50 rounded space-y-2">
                  <p className="text-xs font-semibold text-[#1B2A4A] mb-2">{t('modifiers', language)}</p>
                  {selectedCard.modifiers.minFare && <div className="text-xs"><span className="text-[#8B8FA8]">{t('minFareLabel', language)}</span> ₹{selectedCard.modifiers.minFare / 100}</div>}
                  {selectedCard.modifiers.nightCharge && <div className="text-xs"><span className="text-[#8B8FA8]">{t('nightChargeLabel', language)}</span> {selectedCard.modifiers.nightCharge}%{selectedCard.modifiers.nightStartHour && ` (${selectedCard.modifiers.nightStartHour}:00 - ${selectedCard.modifiers.nightEndHour}:00)`}</div>}
                  {selectedCard.modifiers.waitingPerHour && <div className="text-xs"><span className="text-[#8B8FA8]">{t('waitingLabel', language)}</span> ₹${selectedCard.modifiers.waitingPerHour / 100}/hr{selectedCard.modifiers.freeWaitingMinutes && ` (${selectedCard.modifiers.freeWaitingMinutes} ${t('minFree', language)})`}</div>}
                  {selectedCard.modifiers.tollHandling && <div className="text-xs"><span className="text-[#8B8FA8]">{t('tollLabel', language)}</span> {selectedCard.modifiers.tollHandling}</div>}
                </div>
              )}
              <div><p className="text-xs text-[#8B8FA8] mb-1">{t('validFrom', language)}</p><p className="text-sm font-medium text-[#1B2A4A]">{formatDate(selectedCard.validFrom)}</p></div>
              {selectedCard.validTo && <div><p className="text-xs text-[#8B8FA8] mb-1">{t('validTo', language)}</p><p className="text-sm font-medium text-[#1B2A4A]">{formatDate(selectedCard.validTo)}</p></div>}
              <div><p className="text-xs text-[#8B8FA8] mb-1">{t('version', language)}</p><p className="text-sm font-medium text-[#1B2A4A]">v{selectedCard.version}</p></div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-[#8B8FA8] mb-3 font-semibold">{t('versionHistory', language)}</p>
              <div className="space-y-2">
                {relatedVersions.sort((a, b) => b.version - a.version).map((rc) => (
                  <div key={rc.id} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-semibold">v{rc.version}</span>
                      <Badge variant={activeCardIds.has(rc.id) ? 'green' : 'default'} className="text-xs">{activeCardIds.has(rc.id) ? t('active', language) : t('superseded', language)}</Badge>
                    </div>
                    <p className="text-[#8B8FA8]">{t('validFromPrefix', language)} {formatDate(rc.validFrom)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-[#8B8FA8] italic">{t('priceLockNote', language)}</p>
            </div>
            {activeCardIds.has(selectedCard.id) && (
              <Button onClick={() => router.push(`/rate-manager/create?from=${selectedCard.id}`)}>{t('createNewVersion', language)}</Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
