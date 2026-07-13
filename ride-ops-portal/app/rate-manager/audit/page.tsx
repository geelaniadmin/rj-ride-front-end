'use client';

import React, { useState, useMemo } from 'react';
import { useRateCardStore } from '@/stores/rateCardStore';
import { useVendorStore, useLanguageStore, t } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'CREATED' | 'SUPERSEDED' | 'DEACTIVATED'>('all');

  const auditLog = useRateCardStore((s) => s.auditLog);
  const rateCards = useRateCardStore((s) => s.rateCards);
  const language = useLanguageStore((s) => s.language);
  const vendors = useVendorStore((s) => s.vendors);

  const tenantId = 'T1';

  const filtered = useMemo(() => {
    return auditLog.filter((entry) => {
      const rc = rateCards.find((r) => r.id === entry.rateCardId);
      if (!rc || rc.tenantId !== tenantId) return false;

      if (vendorFilter && entry.vendorId !== vendorFilter) return false;
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;

      if (dateFrom && entry.timestamp < dateFrom) return false;
      if (dateTo && entry.timestamp > dateTo) return false;

      return true;
    });
  }, [auditLog, rateCards, vendorFilter, actionFilter, dateFrom, dateTo, tenantId]);

  const columns: Column<any>[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (v) => new Date(v).toLocaleString(),
    },
    {
      key: 'action',
      label: 'Action',
      render: (v) => {
        let variant: any = 'default';
        if (v === 'CREATED') variant = 'green';
        if (v === 'DEACTIVATED') variant = 'red';
        if (v === 'SUPERSEDED') variant = 'amber';
        return <Badge variant={variant}>{v}</Badge>;
      },
    },
    {
      key: 'rateCardId',
      label: 'Rate Card ID',
      render: (v) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      key: 'vendorId',
      label: 'Vendor',
      render: (v) => vendors.find((ve) => ve.id === v)?.name || 'Unknown',
    },
    {
      key: 'version',
      label: 'Version',
      render: (v) => `v${v}`,
    },
    {
      key: 'changedBy',
      label: 'Changed by',
      render: (v) => v || '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('auditLog', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('immutableRecordRateCards', language)}</p>
      </div>

      <Card header={t('filters', language)}>
        <div className="flex flex-wrap gap-4">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          />

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="">{t('allVendors', language)}</option>
            {Array.from(new Set(auditLog.map((a) => a.vendorId))).map((vid) => (
              <option key={vid} value={vid}>
                {vendors.find((v) => v.id === vid)?.name || 'Unknown'}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="all">{t('allActions', language)}</option>
            <option value="CREATED">{t('created', language)}</option>
            <option value="SUPERSEDED">{t('superseded', language)}</option>
            <option value="DEACTIVATED">{t('deactivated', language)}</option>
          </select>
        </div>
      </Card>

      <Card header={`Audit entries (${filtered.length})`}>
        <DataTable columns={columns} data={filtered} rowKey="id" pageSize={20} />
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <p className="text-xs text-[#1B2A4A] italic">
          {t('immutableAuditDesc', language)}
        </p>
      </Card>
    </div>
  );
}
