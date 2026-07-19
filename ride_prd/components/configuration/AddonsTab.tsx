"use client";

import React, { useState, useMemo } from "react";
import { useAddonStore } from "@/stores/addonStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { AddonService, ID, AddonCategory, AddonType } from "@/lib/types";

type DrawerAddon = Omit<AddonService, "id"> & { id?: ID };

interface AddonsTabProps {
  searchQuery?: string;
}

export const AddonsTab: React.FC<AddonsTabProps> = ({ searchQuery = "" }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allAddons = useAddonStore((s) => s.addons);
  const addons = useMemo(() => {
    const filtered = allAddons.filter(a => a.tenantId === activeTenantId);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [allAddons, activeTenantId, searchQuery]);
  const addAddon = useAddonStore((s) => s.addAddon);
  const updateAddon = useAddonStore((s) => s.updateAddon);
  const toggleAddon = useAddonStore((s) => s.toggleAddon);
  const addToast = useToastStore((s) => s.addToast);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<DrawerAddon | null>(null);
  const [formData, setFormData] = useState<DrawerAddon>({
    tenantId: activeTenantId,
    category: "MEET_GREET",
    type: "TABLE",
    name: "",
    defaultInclude: false,
    price: 0,
  });

  const openCreate = () => {
    setEditingAddon(null);
    setFormData({ tenantId: activeTenantId, category: "MEET_GREET", type: "TABLE", name: "", defaultInclude: false, price: 0 });
    setDrawerOpen(true);
  };

  const openEdit = (addon: AddonService) => {
    setEditingAddon(addon);
    setFormData(addon);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      addToast("Addon name is required", "error");
      return;
    }
    if (editingAddon?.id) {
      updateAddon(editingAddon.id, formData);
      addToast("Addon updated", "success");
    } else {
      addAddon(formData);
      addToast("Addon created", "success");
    }
    setDrawerOpen(false);
  };

  const columns: Column[] = [
    { key: "name", header: "Service Name", sortable: true },
    { key: "category", header: "Category", sortable: true, render: (val): React.ReactNode => <Badge variant="purple">{val as string}</Badge> },
    { key: "type", header: "Type", sortable: true },
    { key: "price", header: "Price", sortable: true, render: (val): React.ReactNode => `₹${val}` },
    { key: "defaultInclude", header: "Default", render: (val): React.ReactNode => <Badge variant={val ? "green" : "red"}>{val ? "Yes" : "No"}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-ops-sidebar">Add-on Services ({addons.length})</h3>
        <Button onClick={openCreate} variant="primary" size="sm">
          New Service
        </Button>
      </div>

      <DataTable columns={columns} data={addons.map(a => ({ ...a })) as Record<string, unknown>[]} pageSize={10} emptyMessage="No add-ons" />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingAddon ? "Edit Add-on" : "New Add-on"} width="md">
        <div className="space-y-4">
          <FormField label="Service Name" required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Service name" />
          </FormField>

          <FormField label="Category">
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AddonCategory })}
              options={[
                { value: "MEET_GREET", label: "Meet & Greet" },
                { value: "CHILD_SEAT", label: "Child Seat" },
                { value: "TOLL_ROAD", label: "Toll Road" },
              ]}
            />
          </FormField>

          <FormField label="Type">
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AddonType })}
              options={[
                { value: "TABLE", label: "Table" },
                { value: "SEAT", label: "Seat" },
                { value: "BOOSTER", label: "Booster" },
                { value: "TOLL", label: "Toll" },
              ]}
            />
          </FormField>

          <FormField label="Price">
            <Input
              type="number"
              min="0"
              value={formData.price || 0}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="defaultInclude"
              checked={formData.defaultInclude}
              onChange={(e) => setFormData({ ...formData, defaultInclude: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="defaultInclude" className="text-sm text-ops-sidebar">
              Include by default
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} variant="primary">
              {editingAddon ? "Update" : "Create"}
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

AddonsTab.displayName = "AddonsTab";
