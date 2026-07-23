"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary, csrfFetch } from "@/lib/shared";
import type { components } from "@/lib/shared/api/schema.d";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { HealthStrip } from "@/components/configuration/HealthStrip";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { useToastStore } from "@/stores/toastStore";

type ApiDriver = components["schemas"]["Driver"];
type PatchedDriver = components["schemas"]["PatchedDriver"];
type ApiVendor = components["schemas"]["Vendor"];

interface DriverFormState {
  vendor: string;
  name: string;
  phone: string;
  licence_number: string;
  status: string;
  is_active: boolean;
}

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ON_TRIP", label: "On trip" },
  { value: "OFFLINE", label: "Offline" },
];

interface DriversTabProps {
  searchQuery?: string;
}

export const DriversTab: React.FC<DriversTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Vendor ids to narrow the roster to. Empty = no filter (show every vendor's drivers).
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: keys.fleet.drivers.list({ vendor_in: vendorFilter.join(",") }),
    queryFn: async () => {
      // Server-side via ?vendor_in=<id>,<id> — the list is cursor-paginated, so filtering in
      // the browser would only ever search the rows already fetched.
      const qs = vendorFilter.length ? `?vendor_in=${vendorFilter.join(",")}` : "";
      const resp = await csrfFetch(`/api/v1/fleet/drivers/${qs}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed to load drivers (${resp.status})`);
      return (await resp.json()) as { results?: ApiDriver[] };
    },
  });

  // Agency admins may file a driver under any vendor, so list them all for the dropdown.
  const { data: vendorsData } = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {});
      if (err) throw err;
      return res;
    },
  });
  const vendors = (vendorsData?.results ?? []) as ApiVendor[];
  const vendorFilterOptions = vendors.map((v) => ({ value: v.id, label: v.name }));

  const allDrivers: ApiDriver[] = (data as { results?: ApiDriver[] } | undefined)?.results ?? (data as ApiDriver[] | undefined) ?? [];
  const drivers = searchQuery.trim()
    ? allDrivers.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.phone.includes(searchQuery)
      )
    : allDrivers;

  const createMutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data: res, error: err } = await apiClient.POST("/v1/fleet/drivers", { body: input as unknown as ApiDriver });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.drivers.list() });
      addToast("Driver created", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to create driver", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/fleet/drivers/{id}", {
        params: { path: { id } },
        body: input as unknown as PatchedDriver,
      });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.drivers.list() });
      addToast("Driver updated", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to update driver", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.DELETE("/v1/fleet/drivers/{id}", { params: { path: { id } } });
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.drivers.list() });
      addToast("Driver deactivated", "success");
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to deactivate driver", "error");
    },
  });

  const emptyForm: DriverFormState = { vendor: "", name: "", phone: "", licence_number: "", status: "AVAILABLE", is_active: true };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverFormState>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (driver: ApiDriver) => {
    setEditingId(driver.id);
    // phone & licence_number arrive PII-masked on read, so we never pre-fill them — the
    // user leaves them blank to keep the stored value (partial PATCH) or retypes to change.
    setFormData({
      vendor: driver.vendor,
      name: driver.name,
      phone: "",
      licence_number: "",
      status: driver.status ?? "AVAILABLE",
      is_active: driver.is_active,
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.vendor || !formData.name.trim()) {
      addToast("Vendor and name are required", "error");
      return;
    }
    if (editingId) {
      // Partial update: only send PII fields when the user actually retyped them.
      const input: Record<string, unknown> = {
        vendor: formData.vendor,
        name: formData.name.trim(),
        status: formData.status,
        is_active: formData.is_active,
      };
      if (formData.phone.trim()) input.phone = formData.phone.trim();
      if (formData.licence_number.trim()) input.licence_number = formData.licence_number.trim();
      updateMutation.mutate({ id: editingId, input });
      return;
    }
    if (!formData.phone.trim() || !formData.licence_number.trim()) {
      addToast("Phone and licence number are required", "error");
      return;
    }
    createMutation.mutate({
      vendor: formData.vendor,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      licence_number: formData.licence_number.trim(),
      status: formData.status,
      is_active: formData.is_active,
    });
  };

  const vendorOptions = [
    { value: "", label: "Select vendor…" },
    ...vendors.map((v) => ({ value: v.id, label: v.name })),
  ];

  const columns: Column[] = [
    {
      key: "name",
      header: t("driverName", language),
      sortable: true,
      render: (val): React.ReactNode => <PII value={val as string} type="name" />,
    },
    {
      key: "phone",
      header: t("phone", language),
      render: (val): React.ReactNode => <PII value={val as string} type="phone" />,
    },
    {
      key: "status",
      header: t("status", language),
      render: (val): React.ReactNode => (
        <Badge variant={val === "AVAILABLE" ? "green" : val === "ON_TRIP" ? "blue" : "red"}>
          {val as string}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Active",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>
          {val ? t("active", language) : t("inactive", language)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">
          {t("drivers", language)} ({drivers.length})
        </h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Driver
        </Button>
      </div>

      <HealthStrip expiredCount={0} expiringCount={0} />

      {/* Narrow the roster to one or more vendors — filtered server-side, so it spans every
          driver rather than just the current page. */}
      <div className="w-72">
        <MultiSelectFilter
          options={vendorFilterOptions}
          selected={vendorFilter}
          onChange={setVendorFilter}
          placeholder="All vendors"
          searchPlaceholder="Search vendors…"
        />
      </div>

      <QueryBoundary
        isLoading={isLoading}
        error={error}
        isEmpty={drivers.length === 0}
        emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noDrivers", language)}</p>}
      >
        <DataTable
          columns={columns}
          data={drivers as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noDrivers", language)}
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Driver" : "New Driver"}
        width="md"
      >
        <div className="space-y-4">
          <FormField label="Vendor" required>
            <Select
              options={vendorOptions}
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </FormField>

          <FormField label={t("driverName", language)} required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
            />
          </FormField>

          <FormField label={t("phone", language)} required={!editingId}>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={editingId ? "Leave blank to keep current" : "+91 98765 43210"}
            />
          </FormField>

          <FormField label="Licence Number" required={!editingId}>
            <Input
              value={formData.licence_number}
              onChange={(e) => setFormData({ ...formData, licence_number: e.target.value })}
              placeholder={editingId ? "Leave blank to keep current" : "e.g., KA0120210001234"}
            />
          </FormField>

          <FormField label={t("status", language)}>
            <Select
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="driver-active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="driver-active" className="text-sm text-ops-sidebar">
              Active
            </label>
          </div>

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

      {drivers.map((driver) => (
        <div key={driver.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="font-medium text-ops-sidebar">
            <PII value={driver.name} type="name" />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            <PII value={driver.phone} type="phone" />
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(driver)}>
              {t("edit", language)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate(driver.id)}
              disabled={deleteMutation.isPending}
            >
              {t("deactivate", language)}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

DriversTab.displayName = "DriversTab";
