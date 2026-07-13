"use client";

import React, { useState } from "react";
import { useDispatchStore, FleetPriority, DriverSelection, DispatchRule } from "@/stores/dispatchStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { CheckCircle, Settings, Plus, Trash2, Zap } from "lucide-react";

export const DispatchRulesPanel: React.FC = () => {
  const rules = useDispatchStore((s) => s.rules);
  const activeRuleId = useDispatchStore((s) => s.activeRuleId);
  const setActiveRule = useDispatchStore((s) => s.setActiveRule);
  const updateRule = useDispatchStore((s) => s.updateRule);
  const removeRule = useDispatchStore((s) => s.removeRule);
  const addRule = useDispatchStore((s) => s.addRule);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    fleetPriority: "OWN_FLEET_FIRST" as FleetPriority,
    driverSelection: "RATING" as DriverSelection,
    maxAssignmentsPerDriver: 1,
    preferVehicleWithAC: true,
  });

  const handleAddRule = () => {
    if (!newRule.name.trim()) return;      addRule({
      name: newRule.name,
      fleetPriority: newRule.fleetPriority,
      driverSelection: newRule.driverSelection,
      maxAssignmentsPerDriver: newRule.maxAssignmentsPerDriver,
      preferVehicleWithAC: newRule.preferVehicleWithAC,
    });
    setShowAddModal(false);
    setNewRule({
      name: "",
      fleetPriority: "OWN_FLEET_FIRST",
      driverSelection: "RATING",
      maxAssignmentsPerDriver: 1,
      preferVehicleWithAC: true,
    });
  };

  const fleetPriorityLabels: Record<FleetPriority, string> = {
    OWN_FLEET_FIRST: "Own Fleet First",
    SUB_VENDOR_FIRST: "Sub-Vendors First",
    ROUND_ROBIN: "Round Robin",
    COST_OPTIMIZED: "Cost Optimized (Sub-Vendor)",
  };

  const driverSelectionLabels: Record<DriverSelection, string> = {
    RATING: "Top Rated",
    AVAILABILITY: "Most Available",
    LANGUAGE_MATCH: "Language Match",
    ROUND_ROBIN: "Round Robin",
  };

  return (
    <Card padding="lg" header={
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-brand-blue" />
          <h3 className="font-semibold">Auto-Dispatch Rules</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3 h-3 mr-1" /> New Rule
          </Button>
        </div>
      </div>
    }>
      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">
            No dispatch rules configured. Create one to enable auto-assignment.
          </p>
        ) : (
          rules.map((rule) => {
            const isActive = rule.id === activeRuleId;
            return (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border transition-all ${
                  isActive
                    ? "bg-brand-blue/5 border-brand-blue/30 shadow-sm"
                    : "bg-white border-border hover:border-brand-blue/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{rule.name}</span>
                      {isActive && (
                        <Badge variant="green" className="text-[9px]">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Active
                        </Badge>
                      )}
                    </div>

                    {/* Rule details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] text-text-secondary">
                      <span>
                        Fleet: <strong>{fleetPriorityLabels[rule.fleetPriority]}</strong>
                      </span>
                      <span>
                        Drivers: <strong>{driverSelectionLabels[rule.driverSelection]}</strong>
                      </span>
                      <span>
                        Max/Driver: <strong>{rule.maxAssignmentsPerDriver}</strong>
                      </span>
                      <span>
                        AC: <strong>{rule.preferVehicleWithAC ? "Preferred" : "Any"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveRule(rule.id)}
                        className="text-xs"
                      >
                        <Zap className="w-3 h-3 mr-1" /> Activate
                      </Button>
                    ) : (
                      <Badge variant="green" className="text-[9px]">Active</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRule(rule.id)}
                      className="text-danger/70 hover:text-danger"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Default rule hint */}
        {rules.length > 0 && !rules.find((r) => r.id === activeRuleId) && (
          <p className="text-[10px] text-alert-amber text-center">
            ⚠️ No rule is active. Auto-dispatch will use the first available rule or you can activate one above.
          </p>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <Modal open={true} onClose={() => setShowAddModal(false)} title="New Dispatch Rule">
          <div className="space-y-4">
            <FormField label="Rule Name" required>
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Weekend Night Shift"
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
              />
            </FormField>

            <FormField label="Fleet Priority">
              <Select
                value={newRule.fleetPriority}
                onChange={(e) => setNewRule((p) => ({ ...p, fleetPriority: e.target.value as FleetPriority }))}
                options={[
                  { value: "OWN_FLEET_FIRST", label: "Own Fleet First (use own vehicles before sub-vendors)" },
                  { value: "SUB_VENDOR_FIRST", label: "Sub-Vendors First (offload to sub-vendors)" },
                  { value: "COST_OPTIMIZED", label: "Cost Optimized (lower-cost vendors first)" },
                  { value: "ROUND_ROBIN", label: "Round Robin (distribute evenly across vendors)" },
                ]}
              />
            </FormField>

            <FormField label="Driver Selection">
              <Select
                value={newRule.driverSelection}
                onChange={(e) => setNewRule((p) => ({ ...p, driverSelection: e.target.value as DriverSelection }))}
                options={[
                  { value: "RATING", label: "Top Rated (highest rated drivers first)" },
                  { value: "AVAILABILITY", label: "Most Available (first available)" },
                  { value: "LANGUAGE_MATCH", label: "Language Match (multi-lingual first)" },
                  { value: "ROUND_ROBIN", label: "Round Robin (evenly distribute)" },
                ]}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Max Assignments Per Driver">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newRule.maxAssignmentsPerDriver}
                  onChange={(e) => setNewRule((p) => ({ ...p, maxAssignmentsPerDriver: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>

              <FormField label="Prefer AC Vehicles">
                <Select
                  value={newRule.preferVehicleWithAC ? "yes" : "no"}
                  onChange={(e) => setNewRule((p) => ({ ...p, preferVehicleWithAC: e.target.value === "yes" }))}
                  options={[
                    { value: "yes", label: "Yes (prefer vehicles with AC)" },
                    { value: "no", label: "No (any vehicle)" },
                  ]}
                />
              </FormField>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddRule} variant="primary">
                Create Rule
              </Button>
              <Button onClick={() => setShowAddModal(false)} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

DispatchRulesPanel.displayName = "DispatchRulesPanel";
