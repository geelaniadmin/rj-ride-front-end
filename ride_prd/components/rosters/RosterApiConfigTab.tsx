"use client";

import React, { useMemo, useState } from "react";
import { useTenantStore } from "@ride/shared";
import { useRosterStore } from "@/stores/rosterStore";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Code2, RefreshCw, Plus, Trash2, Plug, Globe, Key } from "lucide-react";

export const RosterApiConfigTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const connectors = useRosterStore((s) => s.connectors);
  const addConnector = useRosterStore((s) => s.addConnector);
  const updateConnector = useRosterStore((s) => s.updateConnector);
  const removeConnector = useRosterStore((s) => s.removeConnector);
  const recordSync = useRosterStore((s) => s.recordSync);
  const addToast = useToastStore((s) => s.addToast);

  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [newConn, setNewConn] = useState({
    name: "",
    type: "CUSTOM_API" as "WORKDAY" | "SAP_SUCCESS_FACTORS" | "BAMBOO_HR" | "CUSTOM_API",
    apiUrl: "",
    apiKey: "",
    syncSchedule: "MANUAL" as "DAILY" | "WEEKLY" | "MANUAL",
    mapping: JSON.stringify({ employee_id: "employeeId", name: "name" }, null, 2),
    active: true,
  });

  const tenantConnectors = useMemo(
    () => connectors.filter((c) => c.tenantId === activeTenantId),
    [connectors, activeTenantId]
  );

  const handleAdd = () => {
    if (!newConn.name.trim() || !newConn.apiUrl.trim()) {
      addToast("Name and API URL are required", "error");
      return;
    }

    addConnector({
      tenantId: activeTenantId,
      name: newConn.name,
      type: newConn.type,
      apiUrl: newConn.apiUrl,
      apiKey: newConn.apiKey || undefined,
      syncSchedule: newConn.syncSchedule,
      mapping: (() => { try { return JSON.parse(newConn.mapping); } catch { return {}; } })(),
      active: newConn.active,
    });

    addToast(`Connector "${newConn.name}" added`, "success");
    setShowAddModal(false);
    setNewConn({
      name: "",
      type: "CUSTOM_API",
      apiUrl: "",
      apiKey: "",
      syncSchedule: "MANUAL",
      mapping: JSON.stringify({ employee_id: "employeeId" }, null, 2),
      active: true,
    });
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    // Simulate sync delay
    await new Promise((r) => setTimeout(r, 1500));
    recordSync(id);
    addToast("Sync completed — roster data pulled from HRMS", "success");
    setSyncingId(null);
  };

  const typeLabels: Record<string, string> = {
    WORKDAY: "Workday",
    SAP_SUCCESS_FACTORS: "SAP SuccessFactors",
    BAMBOO_HR: "BambooHR",
    CUSTOM_API: "Custom API",
  };

  const typeColors: Record<string, "blue" | "green" | "purple" | "amber"> = {
    WORKDAY: "blue",
    SAP_SUCCESS_FACTORS: "purple",
    BAMBOO_HR: "green",
    CUSTOM_API: "amber",
  };

  return (
    <div className="space-y-6">
      {/* API Documentation */}
      <Card padding="lg" header={
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-brand-blue" />
          <h3 className="font-semibold">Roster API — Push Endpoint</h3>
        </div>
      }>
        <div className="space-y-3 text-sm">
          <p className="text-text-secondary">
            Authenticated API endpoint for roster push. Vendors/HRMS systems can POST roster data to this endpoint.
          </p>
          <div className="bg-ops-sidebar rounded-lg p-3 font-mono text-xs space-y-1">
            <p className="text-white">POST /api/v1/rosters/push</p>
            <p className="text-white/60">Authorization: Bearer &lt;tenant-api-token&gt;</p>
            <p className="text-white/60">Content-Type: application/json</p>
          </div>
          <div className="bg-ops-bg rounded-lg p-3 text-xs">
            <p className="text-text-secondary font-medium mb-2">Request Body:</p>
            <pre className="text-text-primary whitespace-pre-wrap">{JSON.stringify({
              employees: [
                {
                  employeeId: "EMP001",
                  name: "John Doe",
                  phone: "+911234567890",
                  gender: "MALE",
                  shift: "DAY",
                  officeZone: "ZONE_A",
                  homeLat: 12.9719,
                  homeLng: 77.5937,
                  officeLat: 12.9344,
                  officeLng: 77.6101,
                  safetyFlags: [],
                },
              ],
              date: "2026-07-01",
            }, null, 2)}</pre>
          </div>
        </div>
      </Card>

      {/* HRMS Connectors */}
      <Card padding="lg" header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-brand-blue" />
            <h3 className="font-semibold">HRMS Connectors ({tenantConnectors.length})</h3>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Connector
          </Button>
        </div>
      }>
        {tenantConnectors.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">
            No HRMS connectors configured. Add one to enable scheduled roster sync.
          </p>
        ) : (
          <div className="space-y-3">
            {tenantConnectors.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-white border border-border rounded-xl hover:border-brand-blue/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeColors[conn.type]} className="text-[10px]">
                        {typeLabels[conn.type]}
                      </Badge>
                      <span className="text-sm font-medium text-text-primary">{conn.name}</span>
                      <Badge variant={conn.active ? "green" : "amber"} className="text-[9px]">
                        {conn.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {conn.apiUrl}
                      </span>
                      {conn.apiKey && (
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          API key configured
                        </span>
                      )}
                      <span>
                        Sync: <strong>{conn.syncSchedule}</strong>
                      </span>
                      {conn.lastSyncAt && (
                        <span>
                          Last sync: <strong>{new Date(conn.lastSyncAt).toLocaleString()}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSync(conn.id)}
                      loading={syncingId === conn.id}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                      Sync Now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConnector(conn.id)}
                      className="text-danger/70 hover:text-danger"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Field Mapping */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-text-secondary mb-1">Field Mapping:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(conn.mapping).map(([csv, field]) => (
                      <span key={csv} className="px-1.5 py-0.5 bg-ops-bg rounded text-[10px] text-text-primary font-mono">
                        {csv} → {field as string}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Connector Modal */}
      {showAddModal && (
        <Modal open={true} onClose={() => setShowAddModal(false)} title="Add HRMS Connector" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Connector Name" required>
                <input
                  type="text"
                  value={newConn.name}
                  onChange={(e) => setNewConn((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Workday Production"
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
              <FormField label="HRMS Type">
                <Select
                  value={newConn.type}
                  onChange={(e) => setNewConn((p) => ({ ...p, type: e.target.value as any }))}
                  options={[
                    { value: "WORKDAY", label: "Workday" },
                    { value: "SAP_SUCCESS_FACTORS", label: "SAP SuccessFactors" },
                    { value: "BAMBOO_HR", label: "BambooHR" },
                    { value: "CUSTOM_API", label: "Custom API" },
                  ]}
                />
              </FormField>
            </div>

            <FormField label="API URL" required>
              <input
                type="url"
                value={newConn.apiUrl}
                onChange={(e) => setNewConn((p) => ({ ...p, apiUrl: e.target.value }))}
                placeholder="https://your-hrms.com/api/employees"
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
              />
            </FormField>

            <FormField label="API Key (encrypted at rest)" hint="Will be encrypted and masked">
              <input
                type="password"
                value={newConn.apiKey}
                onChange={(e) => setNewConn((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
              />
            </FormField>

            <FormField label="Sync Schedule">
              <Select
                value={newConn.syncSchedule}
                onChange={(e) => setNewConn((p) => ({ ...p, syncSchedule: e.target.value as any }))}
                options={[
                  { value: "DAILY", label: "Daily" },
                  { value: "WEEKLY", label: "Weekly" },
                  { value: "MANUAL", label: "Manual (on-demand)" },
                ]}
              />
            </FormField>

            <FormField label="Field Mapping (JSON)" hint="Map CSV/API field names to system field names">
              <textarea
                value={newConn.mapping}
                onChange={(e) => setNewConn((p) => ({ ...p, mapping: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary font-mono"
              />
            </FormField>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} variant="primary">Add Connector</Button>
              <Button onClick={() => setShowAddModal(false)} variant="ghost">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

RosterApiConfigTab.displayName = "RosterApiConfigTab";
