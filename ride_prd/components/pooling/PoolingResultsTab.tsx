"use client";

import React, { useMemo, useState } from "react";
import { useTenantStore } from "@/stores/tenantStore";
import { useRosterStore } from "@/stores/rosterStore";
import { usePoolingStore } from "@/stores/poolingStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useToastStore } from "@/stores/toastStore";
import { runPooling } from "@/lib/poolingEngine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { PII } from "@/components/ui/PII";
import { Route, RefreshCw, Shield, AlertTriangle, CheckCircle, Eye, Users, MapPin } from "lucide-react";
import { PooledTrip } from "@/lib/types";

export const PoolingResultsTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const employees = useRosterStore((s) => s.employees);
  const configs = usePoolingStore((s) => s.configs);
  const pooledTrips = usePoolingStore((s) => s.pooledTrips);
  const addPooledTrip = usePoolingStore((s) => s.addPooledTrip);
  const updatePooledTrip = usePoolingStore((s) => s.updatePooledTrip);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = useMemo(() => allVTs.filter((v) => v.tenantId === activeTenantId), [allVTs, activeTenantId]);
  const addToast = useToastStore((s) => s.addToast);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [isPooling, setIsPooling] = useState(false);
  const [showTripDetail, setShowTripDetail] = useState<string | null>(null);

  const tenantEmployees = useMemo(
    () => employees.filter((e) => e.tenantId === activeTenantId && e.active),
    [employees, activeTenantId]
  );

  const tenantConfigs = useMemo(
    () => configs.filter((c) => c.tenantId === activeTenantId && c.active),
    [configs, activeTenantId]
  );

  const tenantPooledTrips = useMemo(
    () => pooledTrips.filter((t) => t.tenantId === activeTenantId),
    [pooledTrips, activeTenantId]
  );

  const datePooledTrips = useMemo(() => {
    if (!selectedDate) return tenantPooledTrips;
    return tenantPooledTrips.filter((t) => t.date === selectedDate);
  }, [tenantPooledTrips, selectedDate]);

  const handleRunPooling = () => {
    if (!selectedDate) {
      addToast("Select a date for pooling", "error");
      return;
    }

    if (tenantEmployees.length === 0) {
      addToast("No employees registered for pooling", "error");
      return;
    }

    const config = tenantConfigs.find((c) => c.id === selectedConfigId) || tenantConfigs[0];
    if (!config) {
      addToast("No active pooling configuration", "error");
      return;
    }

    const vt = vts.find((v) => v.id === config.vehicleTypeId);
    if (!vt) {
      addToast("Vehicle type not found for config", "error");
      return;
    }

    setIsPooling(true);

    // Run the pooling engine
    const results = runPooling(activeTenantId, tenantEmployees, config, vt, selectedDate);

    let created = 0;
    for (const result of results) {
      if (result.trip) {
        addPooledTrip(result.trip);
        created++;
      }
    }

    addToast(`Pooling complete: ${created} trips planned`, "success");
    setIsPooling(false);
  };

  const handleApprove = (id: string) => {
    updatePooledTrip(id, { status: "APPROVED" });
    addToast("Trip approved for dispatch", "success");
  };

  const handleReplan = (id: string) => {
    updatePooledTrip(id, { status: "REPLANNED" });
    addToast("Trip marked for replanning", "info");
  };

  // Group by office zone for display
  const groupedTrips = useMemo(() => {
    const groups = new Map<string, PooledTrip[]>();
    for (const trip of datePooledTrips) {
      const key = `${trip.officeZone}-${trip.shift}`;
      const existing = groups.get(key) || [];
      existing.push(trip);
      groups.set(key, existing);
    }
    return groups;
  }, [datePooledTrips]);

  const statusColors: Record<string, "green" | "amber" | "blue" | "purple" | "red"> = {
    DRAFT: "amber",
    PLANNED: "blue",
    APPROVED: "green",
    ACTIVE: "green",
    REPLANNED: "purple",
  };

  const columns: Column[] = [
    { key: "officeZone", header: "Zone", sortable: true },
    { key: "shift", header: "Shift", sortable: true },
    {
      key: "employees",
      header: "Employees",
      render: (val: unknown) => {
        const emps = val as any[];
        return `${emps.length}`;
      },
    },
    {
      key: "totalDistance",
      header: "Distance",
      sortable: true,
      render: (val: unknown) => `${(val as number).toFixed(1)} km`,
    },
    {
      key: "estimatedDuration",
      header: "Duration",
      sortable: true,
      render: (val: unknown) => `${Math.round(val as number)} min`,
    },
    {
      key: "safetyChecksPassed",
      header: "Safety",
      render: (val: unknown) =>
        val ? (
          <Badge variant="green" className="text-[9px]">Passed</Badge>
        ) : (
          <Badge variant="red" className="text-[9px]">Issues</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (val: unknown) => (
        <Badge variant={statusColors[val as string] || "amber"}>
          {val as string}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_val: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowTripDetail(row["id"] as string)}>
            <Eye className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleApprove(row["id"] as string)}>
            <CheckCircle className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-purple-600" onClick={() => handleReplan(row["id"] as string)}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card padding="lg" header={
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-brand-blue" />
          <h3 className="font-semibold">Plan Pooled Trips</h3>
        </div>
      }>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <FormField label="Date">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary"
            />
          </FormField>
          <FormField label="Pooling Config">
            <Select
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              options={[
                { value: "", label: "Auto-select best config" },
                ...tenantConfigs.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </FormField>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Users className="w-4 h-4" />
            <span>{tenantEmployees.length} employees available</span>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleRunPooling}
              variant="primary"
              loading={isPooling}
              className="w-full"
            >
              <Route className="w-4 h-4 mr-1" /> Run Pooling
            </Button>
          </div>
        </div>

        {tenantEmployees.length === 0 && (
          <p className="text-xs text-alert-amber">No employees registered. Upload a roster CSV first.</p>
        )}
        {tenantConfigs.length === 0 && (
          <p className="text-xs text-alert-amber">No pooling configurations. Create one in the Pooling Config tab.</p>
        )}
      </Card>

      {/* Pooled Trips */}
      {datePooledTrips.length > 0 && (
        <Card padding="lg" header={
          <h3 className="font-semibold flex items-center gap-2">
            <Route className="w-4 h-4 text-brand-blue" />
            Pooled Trips for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            <Badge variant="blue" className="text-[9px]">{datePooledTrips.length} trips</Badge>
          </h3>
        }>
          {/* Grouped by zone/shift */}
          {Array.from(groupedTrips.entries()).map(([key, trips]) => {
            const [zone, shift] = key.split("-");
            const totalEmployees = trips.reduce((s, t) => s + t.employees.length, 0);
            return (
              <div key={key} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="blue" className="text-[10px]">{zone}</Badge>
                  <Badge variant={shift === "NIGHT" ? "purple" : "amber"} className="text-[10px]">{shift} Shift</Badge>
                  <span className="text-xs text-text-secondary">{totalEmployees} employees in {trips.length} vehicle{trips.length > 1 ? "s" : ""}</span>
                </div>
                <DataTable
                  columns={columns}
                  data={trips as unknown as Record<string, unknown>[]}
                  pageSize={5}
                  emptyMessage="No trips"
                />
              </div>
            );
          })}
        </Card>
      )}

      {datePooledTrips.length === 0 && selectedDate && (
        <Card padding="lg">
          <p className="text-sm text-text-secondary text-center py-4">
            No pooled trips for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
            Click "Run Pooling" to plan trips.
          </p>
        </Card>
      )}

      {/* Trip Detail Modal */}
      {showTripDetail && (() => {
        const trip = tenantPooledTrips.find((t) => t.id === showTripDetail);
        if (!trip) return null;
        return (
          <Modal open={true} onClose={() => setShowTripDetail(null)} title={`Pooled Trip — ${trip.officeZone} (${trip.shift} Shift)`} size="lg">
            <div className="space-y-4">
              {/* Route */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Route ({trip.stops.length} stops)
                </p>
                <div className="space-y-1">
                  {trip.stops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        i === 0 ? "bg-green-100 text-green-700" : "bg-brand-blue text-white"
                      }`}>
                        {i === 0 ? "O" : i}
                      </span>
                      <span className="text-text-primary">{stop.address}</span>
                      {i === 0 && <Badge variant="green" className="text-[8px]">Pickup</Badge>}
                      {i > 0 && <Badge variant="blue" className="text-[8px]">Drop</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Employees */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Employees ({trip.employees.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {trip.employees.map((emp, i) => (
                    <div key={i} className="px-2 py-1 bg-ops-bg border border-border rounded text-xs text-text-primary">
                      <PII value={emp.name} type="name" />
                      <span className="text-text-secondary ml-1">({emp.employeeId})</span>
                      {emp.safetyFlags.length > 0 && (
                        <span className="ml-1">
                          {emp.safetyFlags.includes("LONE_FEMALE") && <Badge variant="red" className="text-[8px]">Female</Badge>}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-ops-bg rounded-lg text-center">
                  <p className="text-lg font-bold text-text-primary">{trip.totalDistance.toFixed(1)}</p>
                  <p className="text-[10px] text-text-secondary">Total Distance (km)</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg text-center">
                  <p className="text-lg font-bold text-text-primary">{Math.round(trip.estimatedDuration)}</p>
                  <p className="text-[10px] text-text-secondary">Est. Duration (min)</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg text-center">
                  <p className="text-lg font-bold text-text-primary">{trip.employees.length}</p>
                  <p className="text-[10px] text-text-secondary">Employees</p>
                </div>
              </div>

              {/* Safety */}
              <div className={`p-3 rounded-lg border ${trip.safetyChecksPassed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {trip.safetyChecksPassed ? (
                    <Shield className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${trip.safetyChecksPassed ? "text-green-700" : "text-red-700"}`}>
                    {trip.safetyChecksPassed ? "All safety checks passed" : "Safety issues detected"}
                  </span>
                </div>
                {trip.safetyIssues.length > 0 && (
                  <ul className="space-y-1">
                    {trip.safetyIssues.map((issue, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => { handleApprove(trip.id); setShowTripDetail(null); }} variant="primary">
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve for Dispatch
                </Button>
                <Button onClick={() => { handleReplan(trip.id); setShowTripDetail(null); }} variant="secondary">
                  <RefreshCw className="w-4 h-4 mr-1" /> Replan
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

PoolingResultsTab.displayName = "PoolingResultsTab";
