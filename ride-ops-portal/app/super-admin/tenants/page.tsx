'use client';

import React, { useState } from 'react';
import { useLanguageStore, t } from '@ride/shared';
import { useTenantStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { useToastStore } from '@/components/ui/Toast';
import { Plus, Edit2 } from 'lucide-react';

export default function TenantsPage() {
  const language = useLanguageStore((s) => s.language);
  const tenants = useTenantStore((s) => s.tenants);
  const addTenant = useTenantStore((s) => s.addTenant);
  const updateTenant = useTenantStore((s) => s.updateTenant);
  const addToast = useToastStore((s) => s.addToast);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', legalName: '', baseCity: '', contractCurrency: 'INR' });

  const handleSave = () => {
    if (!formData.name || !formData.legalName || !formData.baseCity) {
      addToast({ type: 'error', message: t('fillAllRequiredFields', language), duration: 3000 });
      return;
    }
    if (editingId) {
      updateTenant(editingId, formData);
      addToast({ type: 'success', message: t('tenantUpdated', language), duration: 2000 });
    } else {
      addTenant(formData);
      addToast({ type: 'success', message: t('tenantCreated', language), duration: 2000 });
    }
    setShowDrawer(false);
    setFormData({ name: '', legalName: '', baseCity: '', contractCurrency: 'INR' });
    setEditingId(null);
  };

  const handleEdit = (tenant: any) => {
    setFormData({ name: tenant.name, legalName: tenant.legalName, baseCity: tenant.baseCity, contractCurrency: tenant.contractCurrency });
    setEditingId(tenant.id);
    setShowDrawer(true);
  };

  const handleNew = () => {
    setFormData({ name: '', legalName: '', baseCity: '', contractCurrency: 'INR' });
    setEditingId(null);
    setShowDrawer(true);
  };

  const columns: Column<any>[] = [
    { key: 'name', label: t('name', language), sortable: true },
    { key: 'legalName', label: t('legalName', language) },
    { key: 'baseCity', label: t('baseCity', language) },
    { key: 'contractCurrency', label: t('currency', language) },
    { key: 'id', label: t('actions', language), render: (v, row) => (
      <button onClick={() => handleEdit(row)} className="text-[#2563EB] hover:underline text-sm font-medium flex items-center gap-1">
        <Edit2 className="w-3 h-3" /> {t('edit', language)}
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('tenants', language)}</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">{t('manageTransportOperators', language)}</p>
        </div>
        <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2 inline" /> {t('newTenant', language)}</Button>
      </div>

      <Card header={`${t('tenants', language)} (${tenants.length})`}>
        <DataTable columns={columns} data={tenants} rowKey="id" />
      </Card>

      <Drawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} title={editingId ? t('editTenant', language) : t('newTenant', language)} className="w-[480px]">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">{t('name', language)} *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('tenantNamePlaceholder', language)} className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">{t('legalName', language)} *</label>
            <input type="text" value={formData.legalName} onChange={(e) => setFormData({ ...formData, legalName: e.target.value })} placeholder={t('legalNamePlaceholder', language)} className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">{t('baseCity', language)} *</label>
            <input type="text" value={formData.baseCity} onChange={(e) => setFormData({ ...formData, baseCity: e.target.value })} placeholder={t('baseCityPlaceholder', language)} className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">{t('currency', language)}</label>
            <select value={formData.contractCurrency} onChange={(e) => setFormData({ ...formData, contractCurrency: e.target.value })} className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm">
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>{t('cancel', language)}</Button>
            <Button onClick={handleSave}>{editingId ? t('update', language) : t('create', language)}</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
