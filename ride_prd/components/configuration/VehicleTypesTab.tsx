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

type VehicleType = components["schemas"]["VehicleType"];
type PatchedVehicleType = components["schemas"]["PatchedVehicleType"];

interface VehicleTypeWriteInput {
  name: string;
  ac?: boolean;
  capacity: number;
}

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
      return res;
    },
  });

  const allVts = (data?.results ?? []) as VehicleType[];
  const vts = searchQuery.trim()
    ? allVts.filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allVts;

  const createMutation = useMutation({
    mutationFn: async (input: VehicleTypeWriteInput) => {
      const { data: res, error: err } = await apiClient.POST("/v1/config/vehicle-types", { body: input as unknown as VehicleType });
      if (err) throw err;
      return res;
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
    mutationFn: async ({ id, input }: { id: string; input: VehicleTypeWriteInput }) => {
      const { data: res, error: err } = await apiClient.PATCH("/v1/config/vehicle-types/{id}", {
        params: { path: { id } },
        body: input as unknown as PatchedVehicleType,
      });
      if (err) throw err;
      return res;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.DELETE("/v1/config/vehicle-types/{id}", { params: { path: { id } } });
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.config.vehicleTypes.list() });
      addToast("Vehicle type deactivated", "success");
    },
    onError: (err: unknown) => {
      addToast(err instanceof Error ? err.message : "Failed to delete vehicle type", "error");
    },
  });

  const emptyForm: VehicleTypeWriteInput = { name: "", capacity: 4, ac: true };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleTypeWriteInput>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (vt: VehicleType) => {
    setEditingId(vt.id);
    setFormData({ name: vt.name, capacity: vt.capacity, ac: vt.ac });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || formData.capacity < 1) {
      addToast("Name and seating capacity are required", "error");
      return;
    }
    const input: VehicleTypeWriteInput = {
      name: formData.name,
      capacity: formData.capacity,
      ac: formData.ac,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const columns: Column[] = [
    { key: "name", header: "Type Name", sortable: true },
    { key: "capacity", header: "Seating", sortable: true },
    {
      key: "ac",
      header: "AC",
      render: (val): React.ReactNode => (
        <Badge variant={val ? "green" : "red"}>{val ? "Yes" : "No"}</Badge>
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
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
              }
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ac"
              checked={formData.ac ?? true}
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
              <p className="text-xs text-text-secondary">{vt.capacity} seats · {vt.ac ? "AC" : "Non-AC"}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(vt)}>Edit</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate(vt.id)}
              disabled={deleteMutation.isPending}
            >
              Deactivate
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

VehicleTypesTab.displayName = "VehicleTypesTab";
