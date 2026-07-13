"use client";

import React, { useState, useMemo } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useVendorStore } from "@/stores/vendorStore";
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
import { Vendor, ID } from "@/lib/types";

type DrawerVendor = Omit<Vendor, "id"> & { id?: ID };

interface VendorsTabProps {
  searchQuery?: string;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allVendors = useVendorStore((s) => s.vendors);
  const vendors = useMemo(() => {
    const filtered = allVendors.filter(v => v.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.gstin?.toLowerCase().includes(q) ||
      v.contactName?.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.email?.toLowerCase().includes(q)
    );
  }, [allVendors, activeTenantId, searchQuery]);
  const addVendor = useVendorStore((s) => s.addVendor);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const toggleVendor = useVendorStore((s) => s.toggleVendor);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<DrawerVendor | null>(null);
  const [formData, setFormData] = useState<DrawerVendor>({
    tenantId: activeTenantId,
    name: "",
    type: "SELF",
    gstin: "",
    contactName: "",
    phone: "",
    email: "",
    active: true,
  });

  const openCreate = () => {
    setEditingVendor(null);
    setFormData({ tenantId: activeTenantId, name: "", type: "SELF", gstin: "", contactName: "", phone: "", email: "", active: true });
    setDrawerOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      addToast(t("vendorNameRequired", language), "error");
      return;
    }
    if (editingVendor?.id) {
      updateVendor(editingVendor.id, formData);
      addToast(t("vendorUpdated", language), "success");
    } else {
      addVendor(formData);
      addToast(t("vendorCreated", language), "success");
    }
    setDrawerOpen(false);
  };

  const columns: Column[] = [
    { key: "name", header: t("vendorName", language), sortable: true },
    { key: "type", header: t("vendorType", language), sortable: true, render: (val): React.ReactNode => <Badge variant={val === "SELF" ? "blue" : "purple"}>{val as string}</Badge> },
    { key: "contactName", header: t("contact", language), sortable: true, render: (val): React.ReactNode => val ? <PII value={val as string} type="name" /> : t("dash", language) },
    { key: "phone", header: t("phone", language), render: (val): React.ReactNode => val ? <PII value={val as string} type="phone" /> : t("dash", language) },
    { key: "active", header: t("status", language), render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? t("active", language) : t("inactive", language)}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">{t("vendors", language)} ({vendors.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newVendor", language)}
        </Button>
      </div>

      <DataTable columns={columns} data={vendors.map(v => ({ ...v })) as Record<string, unknown>[]} pageSize={10} emptyMessage={t("noVendors", language)} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingVendor ? t("editVendor", language) : t("newVendor", language)} width="lg">
        <div className="space-y-4">
          <FormField label={t("vendorName", language)} required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t("vendorNamePlaceholder", language)} />
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
            <Input value={formData.gstin || ""} onChange={(e) => setFormData({ ...formData, gstin: e.target.value || undefined })} placeholder="29ABCDE1234F1Z5" />
          </FormField>

          <FormField label={t("contactName", language)}>
            <Input value={formData.contactName || ""} onChange={(e) => setFormData({ ...formData, contactName: e.target.value || undefined })} placeholder={t("contactPerson", language)} />
          </FormField>

          <FormField label={t("phone", language)}>
            <Input
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value || undefined })}
              placeholder="+91 98765 43210"
            />
          </FormField>

          <FormField label={t("email", language)}>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value || undefined })}
              placeholder="contact@vendor.local"
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingVendor ? t("update", language) : t("create", language)}
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
                  <Button size="sm" variant="ghost" onClick={() => { toggleVendor(vendor.id); addToast(t(vendor.active ? "vendorDeactivated" : "vendorActivated", language), "success"); }}>
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
