'use client';

import React, { useState } from 'react';
import { useTenantStore } from '@/stores/tenantStore';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToastStore } from '@/components/ui/Toast';
import { Plus, Edit2 } from 'lucide-react';

export default function TenantsPage() {
  const tenants = useTenantStore((s) => s.tenants);
  const addTenant = useTenantStore((s) => s.addTenant);
  const updateTenant = useTenantStore((s) => s.updateTenant);
  const addToast = useToastStore((s) => s.addToast);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    baseCity: '',
    contractCurrency: 'INR',
  });

  const handleSave = () => {
    if (!formData.name || !formData.legalName || !formData.baseCity) {
      addToast({ type: 'error', message: 'Fill all required fields', duration: 3000 });
      return;
    }

    if (editingId) {
      updateTenant(editingId, formData);
      addToast({ type: 'success', message: 'Tenant updated', duration: 2000 });
    } else {
      addTenant(formData);
      addToast({ type: 'success', message: 'Tenant created', duration: 2000 });
    }

    setShowModal(false);
    setFormData({ name: '', legalName: '', baseCity: '', contractCurrency: 'INR' });
    setEditingId(null);
  };

  const handleEdit = (tenant: any) => {
    setFormData({
      name: tenant.name,
      legalName: tenant.legalName,
      baseCity: tenant.baseCity,
      contractCurrency: tenant.contractCurrency,
    });
    setEditingId(tenant.id);
    setShowModal(true);
  };

  const handleNew = () => {
    setFormData({ name: '', legalName: '', baseCity: '', contractCurrency: 'INR' });
    setEditingId(null);
    setShowModal(true);
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'legalName', label: 'Legal Name' },
    { key: 'baseCity', label: 'Base City' },
    { key: 'contractCurrency', label: 'Currency' },
    {
      key: 'id',
      label: 'Actions',
      render: (v, row) => (
        <button
          onClick={() => handleEdit(row)}
          className="text-[#2563EB] hover:underline text-sm font-medium flex items-center gap-1"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">Tenants</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">Manage transport operators</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2 inline" /> New Tenant
        </Button>
      </div>

      <Card header={`Tenants (${tenants.length})`}>
        <DataTable columns={columns} data={tenants} rowKey="id" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Tenant' : 'New Tenant'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Uber India"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Legal Name *</label>
            <input
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="e.g., Uber India Private Limited"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Base City *</label>
            <input
              type="text"
              value={formData.baseCity}
              onChange={(e) => setFormData({ ...formData, baseCity: e.target.value })}
              placeholder="e.g., Bangalore"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2">Currency</label>
            <select
              value={formData.contractCurrency}
              onChange={(e) => setFormData({ ...formData, contractCurrency: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
