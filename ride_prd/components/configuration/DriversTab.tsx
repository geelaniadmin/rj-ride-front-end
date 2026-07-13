"use client";

import React, { useState, useMemo } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useDriverStore } from "@/stores/driverStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { HealthStrip } from "@/components/configuration/HealthStrip";
import { DocumentStatus } from "@/components/configuration/DocumentStatus";
import { isDocumentExpired, isDocumentExpiringSoon } from "@/lib/validation";
import { Driver, ID } from "@/lib/types";

type DrawerDriver = Omit<Driver, "id"> & { id?: ID };

interface DriversTabProps {
  searchQuery?: string;
}

export const DriversTab: React.FC<DriversTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allDrivers = useDriverStore((s) => s.drivers);
  const drivers = useMemo(() => {
    const filtered = allDrivers.filter(d => d.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.licenceNo.toLowerCase().includes(q)
    );
  }, [allDrivers, activeTenantId, searchQuery]);
  const allVendors = useVendorStore((s) => s.vendors);
  const vendors = useMemo(() => allVendors.filter(v => v.tenantId === activeTenantId), [allVendors, activeTenantId]);
  const allVehicles = useVehicleStore((s) => s.vehicles);
  const vehicles = useMemo(() => allVehicles.filter(v => v.tenantId === activeTenantId), [allVehicles, activeTenantId]);
  const addDriver = useDriverStore((s) => s.addDriver);
  const updateDriver = useDriverStore((s) => s.updateDriver);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DrawerDriver | null>(null);
  const [formData, setFormData] = useState<DrawerDriver>({
    tenantId: activeTenantId,
    vendorId: vendors[0]?.id || "",
    name: "",
    phone: "",
    licenceNo: "",
    licenceClass: "HMV",
    documents: [],
    languages: [],
    assignedVehicleIds: [],
    shift: "DAY",
    available: true,
    active: true,
  });

  const openCreate = () => {
    setEditingDriver(null);
    setFormData({
      tenantId: activeTenantId,
      vendorId: vendors[0]?.id || "",
      name: "",
      phone: "",
      licenceNo: "",
      licenceClass: "HMV",
      documents: [],
      languages: [],
      assignedVehicleIds: [],
      shift: "DAY",
      available: true,
      active: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData(driver);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.licenceNo) {
      addToast(t("namePhoneLicenceRequired", language), "error");
      return;
    }
    if (editingDriver?.id) {
      updateDriver(editingDriver.id, formData);
      addToast(t("driverUpdated", language), "success");
    } else {
      addDriver(formData);
      addToast(t("driverCreated", language), "success");
    }
    setDrawerOpen(false);
  };

  const expiredDocs = drivers.reduce((sum, d) => sum + (d.documents?.filter(doc => isDocumentExpired(doc.expiry)).length || 0), 0);
  const expiringSoonDocs = drivers.reduce((sum, d) => sum + (d.documents?.filter(doc => isDocumentExpiringSoon(doc.expiry)).length || 0), 0);

  const columns: Column[] = [
    { key: "name", header: t("driverName", language), sortable: true, render: (val): React.ReactNode => <PII value={val as string} type="name" /> },
    { key: "licenceNo", header: t("licence", language), sortable: true, render: (val): React.ReactNode => <PII value={val as string} type="licence" /> },
    { key: "phone", header: t("phone", language), render: (val): React.ReactNode => <PII value={val as string} type="phone" /> },
    { key: "shift", header: t("shiftLabel", language), sortable: true },
    { key: "available", header: t("status", language), render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? t("available", language) : t("unavailable", language)}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">{t("drivers", language)} ({drivers.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newDriver", language)}
        </Button>
      </div>

      <HealthStrip expiredCount={expiredDocs} expiringCount={expiringSoonDocs} />

      <DataTable columns={columns} data={drivers.map(d => ({ ...d })) as Record<string, unknown>[]} pageSize={10} emptyMessage={t("noDrivers", language)} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingDriver ? t("editDriver", language) : t("newDriver", language)} width="lg">
        <div className="space-y-4">
          <FormField label={t("driverName", language)} required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t("fullNamePlaceholder", language)} />
          </FormField>

          <FormField label={t("phone", language)} required>
            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
          </FormField>

          <FormField label={t("licenceNoLabel", language)} required>
            <Input value={formData.licenceNo} onChange={(e) => setFormData({ ...formData, licenceNo: e.target.value })} placeholder="KA01AB1234" />
          </FormField>

          <FormField label={t("licenceClass", language)}>
            <Input value={formData.licenceClass || ""} onChange={(e) => setFormData({ ...formData, licenceClass: e.target.value || undefined })} placeholder="HMV+PSV" />
          </FormField>

          <FormField label={t("vendor", language)}>
            <Select
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("shiftLabel", language)}>
            <Select
              value={formData.shift || "DAY"}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value as "DAY" | "NIGHT" | "FLEX" })}
              options={[
                { value: "DAY", label: t("day", language) },
                { value: "NIGHT", label: t("night", language) },
                { value: "FLEX", label: t("flex", language) },
              ]}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="available"
              checked={formData.available}
              onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="available" className="text-sm text-ops-sidebar">
              {t("availableForAssignment", language)}
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingDriver ? t("update", language) : t("create", language)}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              {t("cancel", language)}
            </Button>
          </div>
        </div>
      </Drawer>

      {drivers.map(driver => (
        <div key={driver.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-ops-sidebar"><PII value={driver.name} type="name" /></div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(driver)}>{t("edit", language)}</Button>
          </div>
          {driver.documents && driver.documents.length > 0 && (
            <div className="space-y-1 text-xs text-ops-sidebar">
              {driver.documents.map((doc, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span>{doc.kind}: {doc.number || t("dash", language)}</span>
                  <DocumentStatus expiryDate={doc.expiry} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

DriversTab.displayName = "DriversTab";
