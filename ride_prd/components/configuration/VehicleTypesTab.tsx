"use client";

import React, { useState, useMemo } from "react";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { VehicleTypeConfig, ID } from "@/lib/types";

type DrawerVT = Omit<VehicleTypeConfig, "id"> & { id?: ID };

interface VehicleTypesTabProps {
  searchQuery?: string;
}

export const VehicleTypesTab: React.FC<VehicleTypesTabProps> = ({ searchQuery = "" }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes);
  const vts = useMemo(() => {
    const filtered = allVTs.filter(v => v.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(v => v.name.toLowerCase().includes(q));
  }, [allVTs, activeTenantId, searchQuery]);
  const addVT = useVehicleTypeStore((s) => s.addVehicleType);
  const updateVT = useVehicleTypeStore((s) => s.updateVehicleType);
  const toggleVT = useVehicleTypeStore((s) => s.toggleVehicleType);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVT, setEditingVT] = useState<DrawerVT | null>(null);
  const [formData, setFormData] = useState<DrawerVT>({
    tenantId: activeTenantId,
    name: "",
    seatingCapacity: 4,
    ac: true,
    class: "Economy",
    active: true,
  });

  const openCreate = () => {
    setEditingVT(null);
    setFormData({ tenantId: activeTenantId, name: "", seatingCapacity: 4, ac: true, class: "Economy", active: true });
    setDrawerOpen(true);
  };

  const openEdit = (vt: VehicleTypeConfig) => {
    setEditingVT(vt);
    setFormData(vt);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || formData.seatingCapacity < 1) {
      addToast("Name and seating capacity are required", "error");
      return;
    }
    if (editingVT?.id) {
      updateVT(editingVT.id, formData);
      addToast("Vehicle type updated", "success");
    } else {
      addVT(formData);
      addToast("Vehicle type created", "success");
    }
    setDrawerOpen(false);
  };

  const columns: Column[] = [
    { key: "name", header: "Type Name", sortable: true },
    { key: "seatingCapacity", header: "Seating", sortable: true },
    { key: "ac", header: "AC", render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? "Yes" : "No"}</Badge> },
    { key: "class", header: "Class", sortable: true },
    { key: "active", header: "Status", render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">Vehicle Types ({vts.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Type
        </Button>
      </div>

      <DataTable columns={columns} data={vts.map(v => ({ ...v })) as Record<string, unknown>[]} pageSize={10} emptyMessage="No vehicle types" />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingVT ? "Edit Vehicle Type" : "New Vehicle Type"} width="md">
        <div className="space-y-4">
          <FormField label="Type Name" required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Sedan, SUV" />
          </FormField>

          <FormField label="Seating Capacity" required>
            <Input
              type="number"
              min="1"
              value={formData.seatingCapacity}
              onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) || 1 })}
            />
          </FormField>

          <FormField label="Class">
            <Input value={formData.class || ""} onChange={(e) => setFormData({ ...formData, class: e.target.value || undefined })} placeholder="e.g., Economy, Premium" />
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
            <Button onClick={handleSave} variant="primary">
              {editingVT ? "Update" : "Create"}
            </Button>
            <Button onClick={() => setDrawerOpen(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

VehicleTypesTab.displayName = "VehicleTypesTab";
