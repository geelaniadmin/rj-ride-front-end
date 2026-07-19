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

type RateCard = components["schemas"]["RateCard"];
type BasisEnum = components["schemas"]["BasisEnum"];

type RateCardInput = {
  vendor_id: string;
  customer_id: string;
  vehicle_type_id: string;
  basis: BasisEnum;
  rate_per_km_minor?: number | null;
  rate_per_hour_minor?: number | null;
  currency?: string;
  modifiers?: Record<string, unknown>;
  valid_from: string;
  valid_to?: string | null;
};

interface RateCardsTabProps {
  searchQuery?: string;
}

export const RateCardsTab: React.FC<RateCardsTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const { rateCardVendorId, rateCardCustomerId, rateCardVehicleTypeId, setRateCardVendorId, setRateCardCustomerId, setRateCardVehicleTypeId } = useConfigFiltersStore();

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.rateCards.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/pricing/rate-cards", {});
      if (err) throw err;
      return res;
    },
  });

  const { data: vendorsData } = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {});
      if (err) throw err;
      return res;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: keys.config.customers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {});
      if (err) throw err;
      return res;
    },
  });

  const { data: vehicleTypesData } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res;
    },
  });

  const rateCards = (data?.results ?? []) as RateCard[];
  const vendors = (vendorsData?.results ?? []) as components["schemas"]["Vendor"][];
  const customers = (customersData?.results ?? []) as components["schemas"]["Customer"][];
  const vts = (vehicleTypesData?.results ?? []) as components["schemas"]["VehicleType"][];

  const filteredRateCards = rateCards.filter((r) => {
    if (rateCardVendorId && r.vendor !== rateCardVendorId) return false;
    if (rateCardCustomerId && r.customer !== rateCardCustomerId) return false;
    if (rateCardVehicleTypeId && r.vehicle_type !== rateCardVehicleTypeId) return false;
    if (searchQuery.trim() && !r.basis.toLowerCase().includes(searchQuery.toLowerCase()) && !r.valid_from.includes(searchQuery)) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async (input: RateCardInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/pricing/rate-cards", { body: input as unknown as RateCard });
      if (err) throw err;
      return res;
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
    mutationFn: async ({ id, input }: { id: string; input: RateCardInput }) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/pricing/rate-cards/{id}/supersede", {
        params: { path: { id } },
        body: input as unknown as RateCard,
      });
      if (err) throw err;
      return res;
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
  const emptyForm: RateCardInput = {
    vendor_id: vendors[0]?.id ?? "",
    customer_id: customers[0]?.id ?? "",
    vehicle_type_id: vts[0]?.id ?? "",
    basis: "PER_KM",
    rate_per_km_minor: 2000,
    modifiers: { min_fare_minor: 20000 },
    valid_from: today,
    currency: "INR",
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supersedingId, setSupersedingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RateCardInput>(emptyForm);

  const openCreate = () => {
    setSupersedingId(null);
    setFormData({ ...emptyForm, vendor_id: vendors[0]?.id ?? "", customer_id: customers[0]?.id ?? "", vehicle_type_id: vts[0]?.id ?? "" });
    setDrawerOpen(true);
  };

  const openSupersede = (rc: RateCard) => {
    setSupersedingId(rc.id);
    setFormData({
      vendor_id: rc.vendor,
      customer_id: rc.customer,
      vehicle_type_id: rc.vehicle_type,
      basis: rc.basis,
      rate_per_km_minor: rc.rate_per_km_minor,
      rate_per_hour_minor: rc.rate_per_hour_minor,
      modifiers: rc.modifiers as Record<string, unknown> | undefined,
      valid_from: today,
      valid_to: rc.valid_to,
      currency: rc.currency,
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.vendor_id || !formData.customer_id || !formData.vehicle_type_id) {
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
      key: "rate_per_km_minor",
      header: t("perKm", language),
      render: (val): React.ReactNode => (val ? formatMoney(val as number, "INR") : t("dash", language)),
    },
    {
      key: "rate_per_hour_minor",
      header: t("hourly", language),
      render: (val): React.ReactNode => (val ? formatMoney(val as number, "INR") : t("dash", language)),
    },
    { key: "valid_from", header: t("validFrom", language), sortable: true },
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
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("customer", language)} required>
            <Select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label={t("vehicleType", language)} required>
            <Select
              value={formData.vehicle_type_id}
              onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
              options={vts.map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <FormField label={t("basis", language)}>
            <Select
              value={formData.basis}
              onChange={(e) => setFormData({ ...formData, basis: e.target.value as BasisEnum })}
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
                value={formData.rate_per_km_minor ?? 0}
                onChange={(e) => setFormData({ ...formData, rate_per_km_minor: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          {formData.basis === "HOURLY" && (
            <FormField label={t("hourlyRate", language)}>
              <Input
                type="number"
                value={formData.rate_per_hour_minor ?? 0}
                onChange={(e) => setFormData({ ...formData, rate_per_hour_minor: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          )}

          <FormField label={t("validFrom", language)}>
            <Input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
            />
          </FormField>

          <FormField label={t("validTo", language)}>
            <Input
              type="date"
              value={formData.valid_to ?? ""}
              onChange={(e) => setFormData({ ...formData, valid_to: e.target.value || undefined })}
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
                  {rc.vendor_name} × {rc.customer_name}
                </p>
                <p className="text-text-secondary">
                  {rc.basis} v{rc.version} · {rc.vehicle_type_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-ops-sidebar">
                  {rc.valid_from} → {rc.valid_to ?? "∞"}
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
