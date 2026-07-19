"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, QueryBoundary } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/stores/toastStore";

type ConfigVehicleType = components["schemas"]["ConfigVehicleType"];
type VehicleTypeInput = components["schemas"]["VehicleTypeInput"];

interface VehicleTypesTabProps {
  searchQuery?: string;
}

export const VehicleTypesTab: React.FC<VehicleTypesTabProps> = ({ searchQuery = "" }) => {
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res?.result;
    },
  });

  const allVts = data?.results ?? [];
  const vts = searchQuery.trim()
    ? allVts.filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allVts;

  const createMutation = useMutation({
    mutationFn: async (input: VehicleTypeInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/vehicle-types", { body: input });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vehicleTypes.list() });
      addToast("Vehicle type created", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to create vehicle type", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VehicleTypeInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/config/vehicle-types/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vehicleTypes.list() });
      addToast("Vehicle type updated", "success");
      setDrawerOpen(false);
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to update vehicle type", "error");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data: res, error: err } = active
        ? await apiClient.DELETE("/v1/config/vehicle-types/{id}", { params: { path: { id } } })
        : await apiClient.PATCH("/v1/config/vehicle-types/{id}", {
            params: { path: { id } },
            body: { name: "", seatingCapacity: 1, ac: false },
          });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (_data, { active }) => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vehicleTypes.list() });
      addToast(active ? "Vehicle type deactivated" : "Vehicle type activated", "success");
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to toggle vehicle type", "error");
    },
  });

  const emptyForm: VehicleTypeInput = { name: "", seatingCapacity: 4, ac: true, class: "Economy" };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleTypeInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (vt: ConfigVehicleType) => {
    setEditingId(vt.id);
    setFormData({ name: vt.name, seatingCapacity: vt.seatingCapacity, ac: vt.ac, class: vt.class ?? "" });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || formData.seatingCapacity < 1) {
      addToast("Name and seating capacity are required", "error");
      return;
    }
    const input: VehicleTypeInput = {
      name: formData.name,
      seatingCapacity: formData.seatingCapacity,
      ac: formData.ac,
      class: formData.class || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const columns: Column[] = [
    { key: "name", header: "Type Name", sortable: true },
    { key: "seatingCapacity", header: "Seating", sortable: true },
    {
      key: "ac",
      header: "AC",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? "Yes" : "No"}</Badge>
      ),
    },
    { key: "class", header: "Class", sortable: true },
    {
      key: "active",
      header: "Status",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? "Active" : "Inactive"}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">Vehicle Types ({vts.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Type
        </Button>
      </div>

      <QueryBoundary isLoading={isLoading} error={error} isEmpty={vts.length === 0} emptyFallback={<p className="text-sm text-text-secondary py-4">No vehicle types</p>}>
        <DataTable
          columns={columns}
          data={vts as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage="No vehicle types"
        />
      </QueryBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Vehicle Type" : "New Vehicle Type"}
        width="md"
      >
        <div className="space-y-4">
          <FormField label="Type Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sedan, SUV"
            />
          </FormField>

          <FormField label="Seating Capacity" required>
            <Input
              type="number"
              min="1"
              value={formData.seatingCapacity}
              onChange={(e) =>
                setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) || 1 })
              }
            />
          </FormField>

          <FormField label="Class">
            <Input
              value={formData.class ?? ""}
              onChange={(e) => setFormData({ ...formData, class: e.target.value || undefined })}
              placeholder="e.g., Economy, Premium"
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ac"
              checked={formData.ac}
              onChange={(e) => setFormData({ ...formData, ac: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="ac" className="text-sm text-ops-sidebar">
              Air Conditioned
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

      <div className="flex flex-wrap gap-2 pt-4">
        {vts.map((vt) => (
          <div key={vt.id} className="p-3 bg-ops-bg rounded border border-border text-sm flex items-center gap-3">
            <div>
              <p className="font-medium text-ops-sidebar">{vt.name}</p>
              <p className="text-xs text-text-secondary">{vt.seatingCapacity} seats · {vt.ac ? "AC" : "Non-AC"}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(vt)}>Edit</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleMutation.mutate({ id: vt.id, active: vt.active })}
              disabled={toggleMutation.isPending}
            >
              {vt.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

VehicleTypesTab.displayName = "VehicleTypesTab";
