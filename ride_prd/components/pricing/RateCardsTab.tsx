"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary, formatMoney } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/stores/toastStore";
import { useConfigFiltersStore } from "@/stores/configFiltersStore";

type ConfigRateCard = components["schemas"]["ConfigRateCard"];
type ConfigRateCardInput = components["schemas"]["ConfigRateCardInput"];
type RateBasis = ConfigRateCard["basis"];

interface RateCardsTabProps {
  searchQuery?: string;
}

export const RateCardsTab: React.FC<RateCardsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const { rateCardVendorId, rateCardCustomerId, rateCardVehicleTypeId, setRateCardVendorId, setRateCardCustomerId, setRateCardVehicleTypeId } = useConfigFiltersStore();

  const filters = {
    vendor_id: rateCardVendorId || undefined,
    customer_id: rateCardCustomerId || undefined,
    vehicle_type_id: rateCardVehicleTypeId || undefined,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.rateCards.list(filters),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/pricing/rate-cards", {
        params: { query: filters },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const { data: vendorsData } = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const { data: customersData } = useQuery({
    queryKey: keys.config.customers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const { data: vehicleTypesData } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const rateCards = data?.results ?? [];
  const vendors = vendorsData ?? [];
  const customers = customersData ?? [];
  const vts = vehicleTypesData ?? [];

  const filteredRateCards = searchQuery.trim()
    ? rateCards.filter((r) => r.basis.toLowerCase().includes(searchQuery.toLowerCase()) || r.validFrom.includes(searchQuery))
    : rateCards;

  const createMutation = useMutation({
    mutationFn: async (input: ConfigRateCardInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/pricing/rate-cards", { body: input });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.rateCards.list() });
      addToast(t("rateCardCreated", language), "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to create rate card", "error");
    },
  });

  const supersedeMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ConfigRateCardInput }) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/pricing/rate-cards/{id}/supersede", {
        params: { path: { id } },
        body: input,
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.rateCards.list() });
      addToast(t("newVersionCreated", language), "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to supersede rate card", "error");
    },
  });

  const today = new Date().toISOString().split("T")[0] ?? "";
  const emptyForm: ConfigRateCardInput = {
    vendorId: vendors[0]?.id ?? "",
    customerId: customers[0]?.id ?? "",
    vehicleTypeId: vts[0]?.id ?? "",
    basis: "PER_KM",
    perKm: 20,
    modifiers: { minFare: 200 },
    validFrom: today,
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supersedingId, setSupersedingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConfigRateCardInput>(emptyForm);

  const openCreate = () => {
    setSupersedingId(null);
    setFormData({ ...emptyForm, vendorId: vendors[0]?.id ?? "", customerId: customers[0]?.id ?? "", vehicleTypeId: vts[0]?.id ?? "" });
    setDrawerOpen(true);
  };

  const openSupersede = (rc: ConfigRateCard) => {
    setSupersedingId(rc.id);
    setFormData({
      vendorId: rc.vendorId,
      customerId: rc.customerId,
      vehicleTypeId: rc.vehicleTypeId,
      basis: rc.basis,
      perKm: rc.perKm,
      hourlyRate: rc.hourlyRate,
      modifiers: rc.modifiers,
      validFrom: today,
      validTo: rc.validTo,
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.vendorId || !formData.customerId || !formData.vehicleTypeId) {
      addToast(t("vendorCustomerVehicleRequired", language), "error");
      return;
    }
    if (supersedingId) {
      supersedeMutation.mutate({ id: supersedingId, input: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns: Column[] = [
    {
      key: "basis",
      header: t("basis", language),
      sortable: true,
      render: (val): React.ReactNode => <Badge variant="blue">{val as string}</Badge>,
    },
    {
      key: "perKm",
      header: t("perKm", language),
      render: (val): React.ReactNode => (val ? formatMoney((val as number) * 100, "INR") : t("dash", language)),
    },
    {
      key: "hourlyRate",
      header: t("hourly", language),
      render: (val): React.ReactNode => (val ? formatMoney((val as number) * 100, "INR") : t("dash", language)),
    },
    { key: "validFrom", header: t("validFrom", language), sortable: true },
    {
      key: "version",
      header: t("version", language),
      sortable: true,
      render: (val): React.ReactNode => <Badge variant="purple">v{val as number}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("rateCards", language)} ({filteredRateCards.length})
        </h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          {t("newRateCard", language)}
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={rateCardVendorId}
          onChange={(e) => setRateCardVendorId(e.target.value)}
          className="text-xs px-2 py-1 border border-border rounded bg-white text-text-primary"
        >
          <option value="">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select
          value={rateCardCustomerId}
          onChange={(e) => setRateCardCustomerId(e.target.value)}
          className="text-xs px-2 py-1 border border-border rounded bg-white text-text-primary"
        >
          <option value="">All customers</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={rateCardVehicleTypeId}
          onChange={(e) => setRateCardVehicleTypeId(e.target.value)}
          className="text-xs px-2 py-1 border border-border rounded bg-white text-text-primary"
        >
          <option value="">All types</option>
          {vts.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={filteredRateCards.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noRateCards", language)}</p>}>
        <DataTable
          columns={columns}
          data={filteredRateCards as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noRateCards", language)}
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={supersedingId ? t("newVersion", language) : t("newRateCard", language)}
        width="lg"
      >
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
                value={formData.perKm ?? 0}
                onChange={(e) => setFormData({ ...formData, perKm: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          {formData.basis === "HOURLY" && (
            <FormField label={t("hourlyRate", language)}>
              <Input
                type="number"
                value={formData.hourlyRate ?? 0}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          <FormField label={t("minFare", language)}>
            <Input
              type="number"
              value={formData.modifiers?.minFare ?? 0}
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
              value={formData.validTo ?? ""}
              onChange={(e) => setFormData({ ...formData, validTo: e.target.value || undefined })}
            />
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={createMutation.isPending || supersedeMutation.isPending}
            >
              {supersedingId ? t("createVersion", language) : t("create", language)}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              {t("cancel", language)}
            </Button>
          </div>
        </div>
      </Drawer>

      <div className="space-y-3 pt-4">
        <h4 className="font-medium text-text-primary text-sm">{t("versionHistory", language)}</h4>
        {filteredRateCards.map((rc) => (
          <Card key={rc.id} padding="sm" className="text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-ops-sidebar font-medium">
                  {vendors.find((v) => v.id === rc.vendorId)?.name} ×{" "}
                  {customers.find((c) => c.id === rc.customerId)?.name}
                </p>
                <p className="text-text-secondary">
                  {rc.basis} v{rc.version}
                </p>
              </div>
              <div className="text-right">
                <p className="text-ops-sidebar">
                  {rc.validFrom} → {rc.validTo ?? "∞"}
                </p>
                <Button
                  size="sm"
                  className="bg-ops-sidebar text-white border-ops-sidebar shadow-sm hover:bg-ops-sidebar"
                  onClick={() => openSupersede(rc)}
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
