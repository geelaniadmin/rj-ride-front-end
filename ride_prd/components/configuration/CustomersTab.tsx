"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { useToastStore } from "@/stores/toastStore";

type ConfigCustomer = components["schemas"]["ConfigCustomer"];
type CustomerInput = components["schemas"]["CustomerInput"];

interface CustomersTabProps {
  searchQuery?: string;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ searchQuery = "" }) => {
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.customers.list({ search: searchQuery }),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {
        params: { query: { search: searchQuery || undefined } },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const customers = data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/customers", { body: input });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.customers.list() });
      addToast("Customer created", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to create customer", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CustomerInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/config/customers/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.customers.list() });
      addToast("Customer updated", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to update customer", "error");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data: res, error: err } = active
        ? await apiClient.DELETE("/v1/config/customers/{id}", { params: { path: { id } } })
        : await apiClient.PATCH("/v1/config/customers/{id}", {
            params: { path: { id } },
            body: { name: "", code: "" },
          });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (_data, { active }) => {
      void queryClient.invalidateQueries({ queryKey: keys.config.customers.list() });
      addToast(active ? "Customer deactivated" : "Customer activated", "success");
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to toggle customer", "error");
    },
  });

  const emptyForm: CustomerInput = {
    name: "",
    code: "",
    billingCycle: "MONTHLY",
    spocName: "",
    phone: "",
    email: "",
    approvedVehicleTypeIds: [],
    defaultCostCenter: "",
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (customer: ConfigCustomer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      code: customer.code,
      billingCycle: customer.billingCycle,
      spocName: customer.spocName ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      approvedVehicleTypeIds: customer.approvedVehicleTypeIds ?? [],
      defaultCostCenter: customer.defaultCostCenter ?? "",
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      addToast("Name and code are required", "error");
      return;
    }
    const input: CustomerInput = {
      name: formData.name,
      code: formData.code,
      billingCycle: formData.billingCycle,
      spocName: formData.spocName || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      approvedVehicleTypeIds: formData.approvedVehicleTypeIds,
      defaultCostCenter: formData.defaultCostCenter || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const columns: Column[] = [
    { key: "name", header: "Customer Name", sortable: true },
    { key: "code", header: "Code", sortable: true },
    {
      key: "billingCycle",
      header: "Billing",
      sortable: true,
      render: (val): React.ReactNode => <Badge variant="blue">{(val as string) || "-"}</Badge>,
    },
    {
      key: "spocName",
      header: "SPOC",
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="name" /> : "-"),
    },
    {
      key: "phone",
      header: "Phone",
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="phone" /> : "-"),
    },
    {
      key: "active",
      header: "Status",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? "Active" : "Inactive"}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">Customers ({customers.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Customer
        </Button>
      </div>

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={customers.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">No customers</p>}>
        <DataTable
          columns={columns}
          data={customers as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage="No customers"
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Customer" : "New Customer"}
        width="lg"
      >
        <div className="space-y-4">
          <FormField label="Customer Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Customer name"
            />
          </FormField>

          <FormField label="Code" required>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="CUST-001"
            />
          </FormField>

          <FormField label="Billing Cycle">
            <Select
              value={formData.billingCycle ?? "MONTHLY"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingCycle: e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY",
                })
              }
              options={[
                { value: "WEEKLY", label: "Weekly" },
                { value: "FORTNIGHTLY", label: "Fortnightly" },
                { value: "MONTHLY", label: "Monthly" },
              ]}
            />
          </FormField>

          <FormField label="SPOC Name">
            <Input
              value={formData.spocName ?? ""}
              onChange={(e) => setFormData({ ...formData, spocName: e.target.value || undefined })}
              placeholder="Single Point of Contact"
            />
          </FormField>

          <FormField label="Phone">
            <Input
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value || undefined })}
              placeholder="+91 98765 43210"
            />
          </FormField>

          <FormField label="Email">
            <Input
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value || undefined })}
              placeholder="spoc@customer.local"
            />
          </FormField>

          <FormField label="Default Cost Center">
            <Input
              value={formData.defaultCostCenter ?? ""}
              onChange={(e) => setFormData({ ...formData, defaultCostCenter: e.target.value || undefined })}
              placeholder="CC-001"
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update" : "Create"}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>

      <div className="flex flex-wrap gap-2 pt-4">
        {customers.map((customer) => (
          <div key={customer.id} className="p-3 bg-ops-bg rounded border border-border text-sm flex items-center gap-3">
            <div>
              <p className="font-medium text-ops-sidebar">{customer.name}</p>
              <p className="text-xs text-text-secondary">{customer.code}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(customer)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleMutation.mutate({ id: customer.id, active: customer.active })}
              disabled={toggleMutation.isPending}
            >
              {customer.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

CustomersTab.displayName = "CustomersTab";
