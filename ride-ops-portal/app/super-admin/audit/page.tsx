'use client';

import React, { useState, useMemo } from 'react';
import { useRateCardStore } from '@/stores/rateCardStore';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'CREATED' | 'SUPERSEDED' | 'DEACTIVATED'>('all');
  const [searchId, setSearchId] = useState('');

  const auditLog = useRateCardStore((s) => s.auditLog);

  const filtered = useMemo(() => {
    return auditLog.filter((entry) => {
      if (searchId && !entry.rateCardId.toLowerCase().includes(searchId.toLowerCase())) return false;
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (dateFrom && entry.timestamp < dateFrom) return false;
      if (dateTo && entry.timestamp > dateTo) return false;
      return true;
    });
  }, [auditLog, actionFilter, searchId, dateFrom, dateTo]);

  const columns: Column<any>[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (v) => new Date(v).toLocaleString('en-IN'),
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
      label: 'Resource ID',
      render: (v) => <span className="font-mono text-xs">{v.substring(0, 8)}...</span>,
    },
    {
      key: 'vendorId',
      label: 'Entity',
      render: (v) => <span className="text-xs">Vendor</span>,
    },
    {
      key: 'version',
      label: 'Version',
      render: (v) => `v${v}`,
    },
    {
      key: 'changedBy',
      label: 'Changed by',
      render: (v) => v || 'System',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Audit Log</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Immutable record of all system actions</p>
      </div>

      <Card header="Filters">
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm"
          >
            <option value="all">All actions</option>
            <option value="CREATED">Created</option>
            <option value="SUPERSEDED">Superseded</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>

          <input
            type="text"
            placeholder="Search resource ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded text-sm flex-1 min-w-40"
          />
        </div>
      </Card>

      <Card header={`Audit entries (${filtered.length})`}>
        <DataTable columns={columns} data={filtered} rowKey="id" pageSize={20} />
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <p className="text-xs text-[#1B2A4A] italic">
          This immutable audit log is the single source of truth for all system actions. Entries cannot be edited or deleted. All rate card, tenant, and configuration changes are recorded here with timestamps and actor information.
        </p>
      </Card>
    </div>
  );
}
