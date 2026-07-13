"use client";

import React, { useState, useMemo } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useCustomerStore } from "@ride/shared";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
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
import { RateCard, ID, RateBasis } from "@/lib/types";

type DrawerRC = Omit<RateCard, "id">;

interface RateCardsTabProps {
  searchQuery?: string;
}

export const RateCardsTab: React.FC<RateCardsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allRateCards = useRateCardStore((s) => s.rateCards) || [];
  const rateCards = useMemo(() => {
    const filtered = allRateCards.filter((r) => r.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(r =>
      r.basis.toLowerCase().includes(q) ||
      (r.validFrom && r.validFrom.includes(searchQuery))
    );
  }, [allRateCards, activeTenantId, searchQuery]);
  const allVendors = useVendorStore((s) => s.vendors) || [];
  const vendors = useMemo(() => allVendors.filter((v) => v.tenantId === activeTenantId), [allVendors, activeTenantId]);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);

  const addRateCard = useRateCardStore((s) => s.addRateCard);
  const createNewVersion = useRateCardStore((s) => s.createNewVersion);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<RateCard | null>(null);
  const initialFormData: DrawerRC = {
    tenantId: activeTenantId,
    vendorId: ((vendors?.[0]?.id as string | undefined) || "") as string,
    customerId: ((customers?.[0]?.id as string | undefined) || "") as string,
    vehicleTypeId: ((vts?.[0]?.id as string | undefined) || "") as string,
    basis: "PER_KM",
    perKm: 20,
    modifiers: { minFare: 200 },
    validFrom: (new Date().toISOString().split("T")[0] || "") as string,
    version: 1,
  };

  const [formData, setFormData] = useState<DrawerRC>(initialFormData);

  const openCreate = () => {
    setEditingRateCard(null);
    const today: string = new Date().toISOString().split("T")[0] || "";
    const createData: DrawerRC = {
      tenantId: activeTenantId,
      vendorId: (vendors?.[0]?.id as string) || "",
      customerId: (customers?.[0]?.id as string) || "",
      vehicleTypeId: (vts?.[0]?.id as string) || "",
      basis: "PER_KM",
      perKm: 20,
      modifiers: { minFare: 200 },
      validFrom: today,
      version: 1,
    };
    setFormData(createData);
    setDrawerOpen(true);
  };

  const openEdit = (rc: RateCard) => {
    setEditingRateCard(rc);
    setFormData(rc);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.vendorId || !formData.customerId || !formData.vehicleTypeId) {
      addToast(t("vendorCustomerVehicleRequired", language), "error");
      return;
    }
    if (editingRateCard) {
      createNewVersion(editingRateCard.id, formData);
      addToast(t("newVersionCreated", language), "success");
    } else {
      addRateCard(formData);
      addToast(t("rateCardCreated", language), "success");
    }
    setDrawerOpen(false);
  };

  const columns: Column[] = [
    { key: "basis", header: t("basis", language), sortable: true, render: (val): React.ReactNode => <Badge variant="blue">{val as string}</Badge> },
    { key: "perKm", header: t("perKm", language), render: (val): React.ReactNode => val ? `₹${(val as number).toFixed(0)}` : t("dash", language) },
    { key: "hourlyRate", header: t("hourly", language), render: (val): React.ReactNode => val ? `₹${(val as number).toFixed(0)}` : t("dash", language) },
    { key: "validFrom", header: t("validFrom", language), sortable: true },
    { key: "version", header: t("version", language), sortable: true, render: (val): React.ReactNode => <Badge variant="purple">v{val as number}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">{t("rateCards", language)} ({rateCards.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newRateCard", language)}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rateCards.map((r) => ({ ...r })) as Record<string, unknown>[]}
        pageSize={10}
        emptyMessage={t("noRateCards", language)}
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingRateCard ? t("newVersion", language) : t("newRateCard", language)} width="lg">
        <div className="space-y-4">
          <FormField label={t("vendor", language)} required>
            <Select
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("customer", language)} required>
            <Select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label={t("vehicleType", language)} required>
            <Select
              value={formData.vehicleTypeId}
              onChange={(e) => setFormData({ ...formData, vehicleTypeId: e.target.value })}
              options={vts.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("basis", language)}>
            <Select
              value={formData.basis}
              onChange={(e) => setFormData({ ...formData, basis: e.target.value as RateBasis })}
              options={[
                { value: "PER_KM", label: t("perKm", language) },
                { value: "HOURLY", label: t("hourly", language) },
                { value: "PACKAGE", label: t("package", language) },
                { value: "FIXED_LOCATION_PAIR", label: t("fixedPairs", language) },
              ]}
            />
          </FormField>

          {formData.basis === "PER_KM" && (
            <FormField label={t("ratePerKm", language)}>
              <Input
                type="number"
                value={formData.perKm || 0}
                onChange={(e) => setFormData({ ...formData, perKm: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          {formData.basis === "HOURLY" && (
            <FormField label={t("hourlyRate", language)}>
              <Input
                type="number"
                value={formData.hourlyRate || 0}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          {formData.basis === "PACKAGE" && (
            <div className="space-y-2 text-sm text-text-secondary">
              <p>{t("packageLabel", language).replace("{hours}", String(formData.package?.hours)).replace("{km}", String(formData.package?.km)).replace("{price}", String(formData.package?.price))}</p>
            </div>
          )}

          <FormField label={t("minFare", language)}>
            <Input
              type="number"
              value={formData.modifiers?.minFare || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  modifiers: { ...formData.modifiers, minFare: parseFloat(e.target.value) || 0 },
                })
              }
            />
          </FormField>

          <FormField label={t("validFrom", language)}>
            <Input
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            />
          </FormField>

          <FormField label={t("validTo", language)}>
            <Input
              type="date"
              value={formData.validTo || ""}
              onChange={(e) => setFormData({ ...formData, validTo: e.target.value || undefined })}
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingRateCard ? t("createVersion", language) : t("create", language)}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              {t("cancel", language)}
            </Button>
          </div>
        </div>
      </Drawer>

      <div className="space-y-3 pt-4">
        <h4 className="font-medium text-text-primary text-sm">{t("versionHistory", language)}</h4>
        {rateCards.map((rc) => (
          <Card key={rc.id} padding="sm" className="text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-ops-sidebar font-medium">
                  {vendors.find((v) => v.id === rc.vendorId)?.name} × {customers.find((c) => c.id === rc.customerId)?.name}
                </p>
                <p className="text-text-secondary">{rc.basis} v{rc.version}</p>
              </div>
              <div className="text-right">
                <p className="text-ops-sidebar">{rc.validFrom} → {rc.validTo || "∞"}</p>
                <Button
                  size="sm"
                  className="bg-ops-sidebar text-white border-ops-sidebar shadow-sm hover:bg-ops-sidebar"
                  onClick={() => openEdit(rc)}
                >
                  {t("newVersion", language)}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

RateCardsTab.displayName = "RateCardsTab";
