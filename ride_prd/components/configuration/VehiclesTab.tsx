"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguageStore, t, apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { HealthStrip } from "@/components/configuration/HealthStrip";
import { useToastStore } from "@/stores/toastStore";

type ApiVehicle = components["schemas"]["Vehicle"];
type PatchedVehicle = components["schemas"]["PatchedVehicle"];
type ApiVendor = components["schemas"]["Vendor"];
type ApiVehicleType = components["schemas"]["VehicleType"];

interface VehicleWriteInput {
  vendor: string;
  vehicle_type: string;
  plate: string;
  traccar_device_id?: string;
  is_active?: boolean;
}

interface VehiclesTabProps {
  searchQuery?: string;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({ searchQuery = "" }) => {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: keys.fleet.vehicles.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/fleet/vehicles");
      if (err) throw err;
      return res;
    },
  });

  // Reference data for the create/edit form dropdowns. Agency admins may file a vehicle
  // under any vendor, so we list all vendors and vehicle types.
  const { data: vendorsData } = useQuery({
    queryKey: keys.config.vendors.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vendors", {});
      if (err) throw err;
      return res;
    },
  });
  const { data: vtData } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res;
    },
  });
  const vendors = (vendorsData?.results ?? []) as ApiVendor[];
  const vehicleTypes = (vtData?.results ?? []) as ApiVehicleType[];

  const allVehicles: ApiVehicle[] = (vehiclesData as { results?: ApiVehicle[] } | undefined)?.results ?? (vehiclesData as ApiVehicle[] | undefined) ?? [];

  const vehicles = searchQuery.trim()
    ? allVehicles.filter(
        (v) =>
          v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vehicle_type_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVehicles;

  const createMutation = useMutation({
    mutationFn: async (input: VehicleWriteInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/fleet/vehicles", { body: input as unknown as ApiVehicle });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.vehicles.list() });
      addToast("Vehicle created", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to create vehicle", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VehicleWriteInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/fleet/vehicles/{id}", {
        params: { path: { id } },
        body: input as unknown as PatchedVehicle,
      });
      if (err) throw err;
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.vehicles.list() });
      addToast("Vehicle updated", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to update vehicle", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.DELETE("/v1/fleet/vehicles/{id}", { params: { path: { id } } });
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.fleet.vehicles.list() });
      addToast("Vehicle deactivated", "success");
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to deactivate vehicle", "error");
    },
  });

  const emptyForm: VehicleWriteInput = { vendor: "", vehicle_type: "", plate: "", traccar_device_id: "", is_active: true };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleWriteInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (vehicle: ApiVehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      vendor: vehicle.vendor,
      vehicle_type: vehicle.vehicle_type,
      plate: vehicle.plate,
      traccar_device_id: vehicle.traccar_device_id ?? "",
      is_active: vehicle.is_active,
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.vendor || !formData.vehicle_type || !formData.plate.trim()) {
      addToast("Vendor, vehicle type and registration are required", "error");
      return;
    }
    const input: VehicleWriteInput = {
      vendor: formData.vendor,
      vehicle_type: formData.vehicle_type,
      plate: formData.plate.trim(),
      traccar_device_id: formData.traccar_device_id?.trim() || undefined,
      is_active: formData.is_active,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const vendorOptions = [
    { value: "", label: "Select vendor…" },
    ...vendors.map((v) => ({ value: v.id, label: v.name })),
  ];
  const vehicleTypeOptions = [
    { value: "", label: "Select type…" },
    ...vehicleTypes.map((vt) => ({ value: vt.id, label: vt.name })),
  ];

  const columns: Column[] = [
    { key: "plate", header: t("registration", language), sortable: true },
    {
      key: "vehicle_type_name",
      header: t("type", language),
      sortable: true,
      render: (val): React.ReactNode => (val as string) || t("dash", language),
    },
    {
      key: "vendor_name",
      header: "Vendor",
      sortable: true,
      render: (val): React.ReactNode => (val as string) || t("dash", language),
    },
    {
      key: "is_active",
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
          {t("vehicles", language)} ({vehicles.length})
        </h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Vehicle
        </Button>
      </div>

      <HealthStrip expiredCount={0} expiringCount={0} />

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={vehicles.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">{t("noVehicles", language)}</p>}>
        <DataTable
          columns={columns}
          data={vehicles as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage={t("noVehicles", language)}
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Vehicle" : "New Vehicle"}
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

          <FormField label="Vehicle Type" required>
            <Select
              options={vehicleTypeOptions}
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
            />
          </FormField>

          <FormField label={t("registration", language)} required>
            <Input
              value={formData.plate}
              onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
              placeholder="e.g., KA01AB1234"
            />
          </FormField>

          <FormField label="Traccar Device ID">
            <Input
              value={formData.traccar_device_id ?? ""}
              onChange={(e) => setFormData({ ...formData, traccar_device_id: e.target.value })}
              placeholder="Optional — e.g. 1"
              inputMode="numeric"
            />
            <p className="text-xs text-text-secondary mt-1">
              Traccar&apos;s <strong>numeric device id</strong> (the <code>id</code> column in
              Traccar → Devices) — not the IMEI or plate. GPS only reaches this vehicle when this
              matches.
            </p>
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vehicle-active"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="vehicle-active" className="text-sm text-ops-sidebar">
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

      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="p-3 bg-ops-bg rounded border border-border text-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium text-ops-sidebar">
              {vehicle.vehicle_type_name} — {vehicle.plate}
            </div>
            <Badge variant={vehicle.is_active ? "green" : "red"}>
              {vehicle.is_active ? t("active", language) : t("inactive", language)}
            </Badge>
          </div>
          {vehicle.vendor_name && (
            <p className="text-xs text-text-secondary">{vehicle.vendor_name}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(vehicle)}>
              {t("edit", language)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate(vehicle.id)}
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

VehiclesTab.displayName = "VehiclesTab";
