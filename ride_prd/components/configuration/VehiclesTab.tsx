"use client";

import React, { useState, useMemo } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { HealthStrip } from "@/components/configuration/HealthStrip";
import { DocumentStatus } from "@/components/configuration/DocumentStatus";
import { isDocumentExpired, isDocumentExpiringSoon } from "@/lib/validation";
import { Vehicle, VehicleDocument, ID } from "@/lib/types";

type DrawerVehicle = Omit<Vehicle, "id"> & { id?: ID };

interface VehiclesTabProps {
  searchQuery?: string;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allVehicles = useVehicleStore((s) => s.vehicles);
  const vehicles = useMemo(() => {
    const filtered = allVehicles.filter(v => v.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(v =>
      v.registrationNo.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  }, [allVehicles, activeTenantId, searchQuery]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes);
  const vts = useMemo(() => allVTs.filter(v => v.tenantId === activeTenantId), [allVTs, activeTenantId]);
  const allVendors = useVendorStore((s) => s.vendors);
  const vendors = useMemo(() => allVendors.filter(v => v.tenantId === activeTenantId), [allVendors, activeTenantId]);
  const addVehicle = useVehicleStore((s) => s.addVehicle);
  const updateVehicle = useVehicleStore((s) => s.updateVehicle);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<DrawerVehicle | null>(null);
  const [formData, setFormData] = useState<DrawerVehicle>({
    tenantId: activeTenantId,
    ownerVendorId: vendors[0]?.id || "",
    ownership: "OWN",
    vehicleTypeId: vts[0]?.id || "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    registrationNo: "",
    seatingCapacity: 4,
    ac: true,
    fuelType: "DIESEL",
    documents: [],
    active: true,
  });

  const openCreate = () => {
    setEditingVehicle(null);
    setFormData({
      tenantId: activeTenantId,
      ownerVendorId: vendors[0]?.id || "",
      ownership: "OWN",
      vehicleTypeId: vts[0]?.id || "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      registrationNo: "",
      seatingCapacity: 4,
      ac: true,
      fuelType: "DIESEL",
      documents: [],
      active: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData(vehicle);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.make || !formData.registrationNo) {
      addToast(t("makeRegistrationRequired", language), "error");
      return;
    }
    if (editingVehicle?.id) {
      updateVehicle(editingVehicle.id, formData);
      addToast(t("vehicleUpdated", language), "success");
    } else {
      addVehicle(formData);
      addToast(t("vehicleCreated", language), "success");
    }
    setDrawerOpen(false);
  };

  const expiredDocs = vehicles.reduce((sum, v) => sum + (v.documents?.filter(d => isDocumentExpired(d.expiry)).length || 0), 0);
  const expiringSoonDocs = vehicles.reduce((sum, v) => sum + (v.documents?.filter(d => isDocumentExpiringSoon(d.expiry)).length || 0), 0);

  const columns: Column[] = [
    { key: "registrationNo", header: t("registration", language), sortable: true },
    { key: "make", header: t("makeModel", language), sortable: true, render: (val, row): React.ReactNode => {
      const vehicle = row as unknown as Vehicle;
      return `${val} ${vehicle?.model || ""}`;
    } },
    { key: "vehicleTypeId", header: t("type", language), render: (val): React.ReactNode => {
      const typeId = val as string | undefined;
      return vts.find(v => v.id === typeId)?.name || t("dash", language);
    } },
    { key: "active", header: t("status", language), render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? t("active", language) : t("inactive", language)}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">{t("vehicles", language)} ({vehicles.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newVehicle", language)}
        </Button>
      </div>

      <HealthStrip expiredCount={expiredDocs} expiringCount={expiringSoonDocs} />

      <DataTable columns={columns} data={vehicles.map(v => ({ ...v })) as Record<string, unknown>[]} pageSize={10} emptyMessage={t("noVehicles", language)} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingVehicle ? t("editVehicle", language) : t("newVehicle", language)} width="lg">
        <div className="space-y-4">
          <FormField label={t("make", language)} required>
            <Input value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} placeholder={t("makePlaceholder", language)} />
          </FormField>

          <FormField label={t("model", language)}>
            <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder={t("modelPlaceholder", language)} />
          </FormField>

          <FormField label={t("registration", language)} required>
            <Input value={formData.registrationNo} onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })} placeholder="KA05AB1234" />
          </FormField>

          <FormField label={t("vehicleType", language)}>
            <Select
              value={formData.vehicleTypeId}
              onChange={(e) => setFormData({ ...formData, vehicleTypeId: e.target.value })}
              options={vts.map(v => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("ownerVendor", language)}>
            <Select
              value={formData.ownerVendorId}
              onChange={(e) => setFormData({ ...formData, ownerVendorId: e.target.value })}
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("ownership", language)}>
            <Select
              value={formData.ownership}
              onChange={(e) => setFormData({ ...formData, ownership: e.target.value as "OWN" | "LEASED" | "SUB_VENDOR" })}
              options={[
                { value: "OWN", label: t("own", language) },
                { value: "LEASED", label: t("leased", language) },
                { value: "SUB_VENDOR", label: t("subVendor", language) },
              ]}
            />
          </FormField>

          <FormField label={t("fuelType", language)}>
            <Select
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as "PETROL" | "DIESEL" | "CNG" | "EV" })}
              options={[
                { value: "PETROL", label: t("petrol", language) },
                { value: "DIESEL", label: t("diesel", language) },
                { value: "CNG", label: t("cng", language) },
                { value: "EV", label: t("ev", language) },
              ]}
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingVehicle ? t("update", language) : t("create", language)}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              {t("cancel", language)}
            </Button>
          </div>
        </div>
      </Drawer>

      {vehicles.map(vehicle => (
        <div key={vehicle.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-ops-sidebar">{vehicle.make} {vehicle.model} ({vehicle.registrationNo})</div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(vehicle)}>{t("edit", language)}</Button>
          </div>
          {vehicle.documents && vehicle.documents.length > 0 && (
            <div className="space-y-1 text-xs text-ops-sidebar">
              {vehicle.documents.map((doc, idx) => (
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

VehiclesTab.displayName = "VehiclesTab";
