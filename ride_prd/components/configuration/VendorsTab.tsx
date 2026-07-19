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
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { useToastStore } from "@/stores/toastStore";

type ConfigVendor = components["schemas"]["ConfigVendor"];
type VendorInput = components["schemas"]["VendorInput"];

interface VendorsTabProps {
  searchQuery?: string;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.vendors.list({ search: searchQuery }),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {
        params: { query: { search: searchQuery || undefined } },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const vendors = data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: async (input: VendorInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/vendors", { body: input });
      if (err) throw err;
      return res?.result;
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
    mutationFn: async ({ id, input }: { id: string; input: VendorInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/config/vendors/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (err) throw err;
      return res?.result;
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data: res, error: err } = active
        ? await apiClient.DELETE("/v1/config/vendors/{id}", { params: { path: { id } } })
        : await apiClient.PATCH("/v1/config/vendors/{id}", {
            params: { path: { id } },
            body: { name: "", type: "SELF" },
          });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (_data, { active }) => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vendors.list() });
      addToast(t(active ? "vendorDeactivated" : "vendorActivated", language), "success");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to toggle vendor";
      addToast(msg, "error");
    },
  });

  const emptyForm: VendorInput = { name: "", type: "SELF", gstin: "", contactName: "", phone: "", email: "" };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VendorInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (vendor: ConfigVendor) => {
    setEditingId(vendor.id);
    setFormData({
      name: vendor.name,
      type: vendor.type,
      gstin: vendor.gstin ?? "",
      contactName: vendor.contactName ?? "",
      phone: vendor.phone ?? "",
      email: vendor.email ?? "",
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      addToast(t("vendorNameRequired", language), "error");
      return;
    }
    const input: VendorInput = {
      name: formData.name,
      type: formData.type,
      gstin: formData.gstin || undefined,
      contactName: formData.contactName || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const columns: Column[] = [
    { key: "name", header: t("vendorName", language), sortable: true },
    {
      key: "type",
      header: t("vendorType", language),
      sortable: true,
      render: (val): React.ReactNode => (
        <Badge variant={val === "SELF" ? "blue" : "purple"}>{val as string}</Badge>
      ),
    },
    {
      key: "contactName",
      header: t("contact", language),
      sortable: true,
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="name" /> : t("dash", language)),
    },
    {
      key: "phone",
      header: t("phone", language),
      render: (val): React.ReactNode => (val ? <PII value={val as string} type="phone" /> : t("dash", language)),
    },
    {
      key: "active",
      header: t("status", language),
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? t("active", language) : t("inactive", language)}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("vendors", language)} ({vendors.length})
        </h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newVendor", language)}
        </Button>
      </div>

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={vendors.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noVendors", language)}</p>}>
        <DataTable
          columns={columns}
          data={vendors as unknown as Record<string, unknown>[]}
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

          <FormField label={t("vendorType", language)}>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as "SELF" | "SUB_VENDOR" })}
              options={[
                { value: "SELF", label: t("selfOperator", language) },
                { value: "SUB_VENDOR", label: t("subVendor", language) },
              ]}
            />
          </FormField>

          <FormField label="GSTIN">
            <Input
              value={formData.gstin ?? ""}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value || undefined })}
              placeholder="29ABCDE1234F1Z5"
            />
          </FormField>

          <FormField label={t("contactName", language)}>
            <Input
              value={formData.contactName ?? ""}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value || undefined })}
              placeholder={t("contactPerson", language)}
            />
          </FormField>

          <FormField label={t("phone", language)}>
            <Input
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value || undefined })}
              placeholder="+91 98765 43210"
            />
          </FormField>

          <FormField label={t("email", language)}>
            <Input
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value || undefined })}
              placeholder="contact@vendor.local"
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
        {vendors.map((vendor) => (
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
                    onClick={() => toggleMutation.mutate({ id: vendor.id, active: vendor.active })}
                    disabled={toggleMutation.isPending}
                  >
                    {vendor.active ? t("deactivate", language) : t("activate", language)}
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
