"use client";

import React, { useMemo, useState } from "react";
import { useTenantStore } from "@/stores/tenantStore";
import { usePoolingStore } from "@/stores/poolingStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Shield, Settings, Plus, Trash2, Users, Gauge } from "lucide-react";
import { SafetyConstraint } from "@/lib/types";

export const PoolingDashboard: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const configs = usePoolingStore((s) => s.configs);
  const addConfig = usePoolingStore((s) => s.addConfig);
  const updateConfig = usePoolingStore((s) => s.updateConfig);
  const removeConfig = usePoolingStore((s) => s.removeConfig);

  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);
  const addToast = useToastStore((s) => s.addToast);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCfg, setNewCfg] = useState({
    name: "",
    maxPassengersPerVehicle: 4,
    maxDetourPercent: 30,
    maxWaitMinutes: 10,
    vehicleTypeId: vts[0]?.id || "",
  });

  const tenantConfigs = useMemo(
    () => configs.filter((c) => c.tenantId === activeTenantId),
    [configs, activeTenantId]
  );

  const handleAdd = () => {
    if (!newCfg.name.trim() || !newCfg.vehicleTypeId) {
      addToast("Name and vehicle type are required", "error");
      return;
    }

    addConfig({
      tenantId: activeTenantId,
      name: newCfg.name,
      maxPassengersPerVehicle: newCfg.maxPassengersPerVehicle,
      maxDetourPercent: newCfg.maxDetourPercent,
      maxWaitMinutes: newCfg.maxWaitMinutes,
      safetyConstraints: [
        { type: "NO_LONE_FEMALE_LAST_DROP", enabled: true },
        { type: "SAME_GENDER_PREFERRED", enabled: false },
        { type: "NIGHT_SHIFT_ESCORT", enabled: true },
        { type: "MAX_TRAVEL_TIME", enabled: true, params: { maxMinutes: 90 } },
        { type: "NO_OVERNIGHT_ALONE", enabled: true },
      ],
      vehicleTypeId: newCfg.vehicleTypeId,
      active: true,
    });

    addToast(`Pooling config "${newCfg.name}" created`, "success");
    setShowAddModal(false);
  };

  const toggleConstraint = (configId: string, type: SafetyConstraint["type"]) => {
    const cfg = tenantConfigs.find((c) => c.id === configId);
    if (!cfg) return;
    const updatedConstraints = cfg.safetyConstraints.map((sc) =>
      sc.type === type ? { ...sc, enabled: !sc.enabled } : sc
    );
    updateConfig(configId, { safetyConstraints: updatedConstraints });
    addToast(`${type} ${updatedConstraints.find((sc) => sc.type === type)?.enabled ? "enabled" : "disabled"}`, "info");
  };

  const constraintLabels: Record<SafetyConstraint["type"], string> = {
    NO_LONE_FEMALE_LAST_DROP: "No Lone Female Last Drop",
    SAME_GENDER_PREFERRED: "Same Gender Preferred",
    NIGHT_SHIFT_ESCORT: "Night Shift Escort",
    MAX_TRAVEL_TIME: "Max Travel Time",
    NO_OVERNIGHT_ALONE: "No Overnight Alone",
  };

  return (
    <div className="space-y-6">
      {/* Pooling Configs */}
      <Card padding="lg" header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-blue" />
            <h3 className="font-semibold">Pooling Configurations ({tenantConfigs.length})</h3>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3 h-3 mr-1" /> New Config
          </Button>
        </div>
      }>
        {tenantConfigs.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">
            No pooling configurations yet. Create one to start planning shared trips.
          </p>
        ) : (
          <div className="space-y-4">
            {tenantConfigs.map((cfg) => {
              const vt = vts.find((v) => v.id === cfg.vehicleTypeId);
              return (
                <div key={cfg.id} className="p-4 bg-white border border-border rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{cfg.name}</span>
                        <Badge variant={cfg.active ? "green" : "amber"} className="text-[9px]">
                          {cfg.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-text-secondary">
                        <span><Users className="w-3 h-3 inline mr-1" />{cfg.maxPassengersPerVehicle} max</span>
                        <span><Gauge className="w-3 h-3 inline mr-1" />{cfg.maxDetourPercent}% detour</span>
                        <span>Wait: {cfg.maxWaitMinutes} min</span>
                        <span>Vehicle: {vt?.name || "Unknown"}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConfig(cfg.id)}
                      className="text-danger/70 hover:text-danger"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Safety Constraints */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Safety Constraints
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cfg.safetyConstraints.map((sc) => (
                        <button
                          key={sc.type}
                          onClick={() => toggleConstraint(cfg.id, sc.type)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                            sc.enabled
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-400 border border-gray-200 line-through"
                          }`}
                        >
                          {constraintLabels[sc.type]}
                          {sc.type === "MAX_TRAVEL_TIME" && sc.params?.maxMinutes && (
                            <span className="ml-1">({sc.params.maxMinutes}m)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capacity Warning */}
                  {vt && (
                    <div className="text-[10px] text-text-secondary">
                      Vehicle capacity: <strong>{vt.seatingCapacity} seats</strong> — max pooling: <strong>{Math.min(cfg.maxPassengersPerVehicle, vt.seatingCapacity)}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Config Modal */}
      {showAddModal && (
        <Modal open={true} onClose={() => setShowAddModal(false)} title="New Pooling Configuration" size="md">
          <div className="space-y-4">
            <FormField label="Configuration Name" required>
              <input
                type="text"
                value={newCfg.name}
                onChange={(e) => setNewCfg((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Office Pooling"
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Max Passengers">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newCfg.maxPassengersPerVehicle}
                  onChange={(e) => setNewCfg((p) => ({ ...p, maxPassengersPerVehicle: parseInt(e.target.value) || 4 }))}
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
              <FormField label="Max Detour (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newCfg.maxDetourPercent}
                  onChange={(e) => setNewCfg((p) => ({ ...p, maxDetourPercent: parseInt(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Max Wait (minutes)">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newCfg.maxWaitMinutes}
                  onChange={(e) => setNewCfg((p) => ({ ...p, maxWaitMinutes: parseInt(e.target.value) || 10 }))}
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
              <FormField label="Vehicle Type" required>
                <Select
                  value={newCfg.vehicleTypeId}
                  onChange={(e) => setNewCfg((p) => ({ ...p, vehicleTypeId: e.target.value }))}
                  options={vts.map((vt) => ({ value: vt.id, label: `${vt.name} (${vt.seatingCapacity} seats)` }))}
                />
              </FormField>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} variant="primary">Create Config</Button>
              <Button onClick={() => setShowAddModal(false)} variant="ghost">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

PoolingDashboard.displayName = "PoolingDashboard";
