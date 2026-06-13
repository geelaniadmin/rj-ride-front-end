"use client";

import React, { useState, useMemo } from "react";
import { useCustomerStore } from "@ride/shared";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { Customer, ID, BillingCycle } from "@/lib/types";

type DrawerCustomer = Omit<Customer, "id"> & { id?: ID };

interface CustomersTabProps {
  searchQuery?: string;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ searchQuery = "" }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers);
  const customers = useMemo(() => {
    const filtered = allCustomers.filter(c => c.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.spocName?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [allCustomers, activeTenantId, searchQuery]);
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const toggleCustomer = useCustomerStore((s) => s.toggleCustomer);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DrawerCustomer | null>(null);
  const [formData, setFormData] = useState<DrawerCustomer>({
    tenantId: activeTenantId,
    name: "",
    code: "",
    billingCycle: "MONTHLY",
    spocName: "",
    phone: "",
    email: "",
    approvedVehicleTypeIds: [],
    defaultCostCenter: "",
    active: true,
  });

  const openCreate = () => {
    setEditingCustomer(null);
    setFormData({ tenantId: activeTenantId, name: "", code: "", billingCycle: "MONTHLY", spocName: "", phone: "", email: "", approvedVehicleTypeIds: [], defaultCostCenter: "", active: true });
    setDrawerOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      addToast("Name and code are required", "error");
      return;
    }
    if (editingCustomer?.id) {
      updateCustomer(editingCustomer.id, formData);
      addToast("Customer updated", "success");
    } else {
      addCustomer(formData);
      addToast("Customer created", "success");
    }
    setDrawerOpen(false);
  };

  const columns: Column[] = [
    { key: "name", header: "Customer Name", sortable: true },
    { key: "code", header: "Code", sortable: true },
    { key: "billingCycle", header: "Billing", sortable: true, render: (val): React.ReactNode => <Badge variant="blue">{(val as string) || "-"}</Badge> },
    { key: "spocName", header: "SPOC", render: (val): React.ReactNode => val ? <PII value={val as string} type="name" /> : "-" },
    { key: "phone", header: "Phone", render: (val): React.ReactNode => val ? <PII value={val as string} type="phone" /> : "-" },
    { key: "active", header: "Status", render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">Customers ({customers.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Customer
        </Button>
      </div>

      <DataTable columns={columns} data={customers.map(c => ({ ...c })) as Record<string, unknown>[]} pageSize={10} emptyMessage="No customers" />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingCustomer ? "Edit Customer" : "New Customer"} width="lg">
        <div className="space-y-4">
          <FormField label="Customer Name" required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Customer name" />
          </FormField>

          <FormField label="Code" required>
            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CUST-001" />
          </FormField>

          <FormField label="Billing Cycle">
            <Select
              value={formData.billingCycle || "MONTHLY"}
              onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as BillingCycle })}
              options={[
                { value: "WEEKLY", label: "Weekly" },
                { value: "FORTNIGHTLY", label: "Fortnightly" },
                { value: "MONTHLY", label: "Monthly" },
              ]}
            />
          </FormField>

          <FormField label="SPOC Name">
            <Input value={formData.spocName || ""} onChange={(e) => setFormData({ ...formData, spocName: e.target.value || undefined })} placeholder="Single Point of Contact" />
          </FormField>

          <FormField label="Phone">
            <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value || undefined })} placeholder="+91 98765 43210" />
          </FormField>

          <FormField label="Email">
            <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value || undefined })} placeholder="spoc@customer.local" />
          </FormField>

          <FormField label="Default Cost Center">
            <Input value={formData.defaultCostCenter || ""} onChange={(e) => setFormData({ ...formData, defaultCostCenter: e.target.value || undefined })} placeholder="CC-001" />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingCustomer ? "Update" : "Create"}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

CustomersTab.displayName = "CustomersTab";
