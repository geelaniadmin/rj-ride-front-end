"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { useToastStore } from "@/stores/toastStore";

type Vendor = components["schemas"]["Vendor"];
type PatchedVendor = components["schemas"]["PatchedVendor"];

interface VendorWriteInput {
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
}

interface VendorsTabProps {
  searchQuery?: string;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.vendors.list({ name: searchQuery }),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {
        params: { query: { name: searchQuery || undefined } },
      });
      if (err) throw err;
      return res;
    },
  });

  const vendors = (data?.results ?? []) as Vendor[];

  const createMutation = useMutation({
    mutationFn: async (input: VendorWriteInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/vendors", { body: input as unknown as Vendor });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vendors.list() });
      addToast(t("vendorCreated", language), "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create vendor";
      addToast(msg, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VendorWriteInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/config/vendors/{id}", {
        params: { path: { id } },
        body: input as unknown as PatchedVendor,
      });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vendors.list() });
      addToast(t("vendorUpdated", language), "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update vendor";
      addToast(msg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.DELETE("/v1/config/vendors/{id}", { params: { path: { id } } });
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vendors.list() });
      addToast(t("vendorDeactivated", language), "success");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete vendor";
      addToast(msg, "error");
    },
  });

  const emptyForm: VendorWriteInput = { name: "", contact_name: "", contact_phone: "", contact_email: "", address: "" };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VendorWriteInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setFormData({
      name: vendor.name,
      contact_name: vendor.contact_name ?? "",
      contact_phone: vendor.contact_phone ?? "",
      contact_email: vendor.contact_email ?? "",
      address: vendor.address ?? "",
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      addToast(t("vendorNameRequired", language), "error");
      return;
    }
    const input: VendorWriteInput = {
      name: formData.name,
      contact_name: formData.contact_name || undefined,
      contact_phone: formData.contact_phone || undefined,
      contact_email: formData.contact_email || undefined,
      address: formData.address || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const filtered = searchQuery.trim()
    ? vendors.filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : vendors;

  const columns: Column[] = [
    { key: "name", header: t("vendorName", language), sortable: true },
    {
      key: "contact_name",
      header: t("contact", language),
      sortable: true,
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="name" /> : t("dash", language)),
    },
    {
      key: "contact_phone",
      header: t("phone", language),
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="phone" /> : t("dash", language)),
    },
    {
      key: "contact_email",
      header: t("email", language),
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="email" /> : t("dash", language)),
    },
    {
      key: "address",
      header: "Address",
      render: (val): React.ReactNode => (val ? <span className="text-text-secondary">{val as string}</span> : t("dash", language)),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("vendors", language)} ({filtered.length})
        </h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newVendor", language)}
        </Button>
      </div>

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={filtered.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noVendors", language)}</p>}>
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noVendors", language)}
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? t("editVendor", language) : t("newVendor", language)}
        width="lg"
      >
        <div className="space-y-4">
          <FormField label={t("vendorName", language)} required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("vendorNamePlaceholder", language)}
            />
          </FormField>

          <FormField label={t("contactName", language)}>
            <Input
              value={formData.contact_name ?? ""}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value || undefined })}
              placeholder={t("contactPerson", language)}
            />
          </FormField>

          <FormField label={t("phone", language)}>
            <Input
              value={formData.contact_phone ?? ""}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value || undefined })}
              placeholder="+91 98765 43210"
            />
          </FormField>

          <FormField label={t("email", language)}>
            <Input
              type="email"
              value={formData.contact_email ?? ""}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value || undefined })}
              placeholder="contact@vendor.local"
            />
          </FormField>

          <FormField label="Address">
            <Input
              value={formData.address ?? ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value || undefined })}
              placeholder="123 Main St, City"
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? t("update", language) : t("create", language)}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              {t("cancel", language)}
            </Button>
          </div>
        </div>
      </Drawer>

      <div className="flex flex-wrap gap-2 pt-4">
        {filtered.map((vendor) => (
          <Card key={vendor.id} padding="sm" className="flex items-center justify-between min-w-fit">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-ops-sidebar">{vendor.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(vendor)}>
                    {t("edit", language)}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(vendor.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {t("deactivate", language)}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

VendorsTab.displayName = "VendorsTab";
