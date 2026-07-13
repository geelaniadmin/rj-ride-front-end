"use client";

import React, { useMemo, useState } from "react";
import { useTenantStore } from "@ride/shared";
import { useRosterStore } from "@/stores/rosterStore";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { Calendar, Clock, History, Trash2, CalendarDays } from "lucide-react";

export const RosterListTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const rosterEntries = useRosterStore((s) => s.rosterEntries);
  const employees = useRosterStore((s) => s.employees);
  const changeLogs = useRosterStore((s) => s.changeLogs);
  const removeRosterEntry = useRosterStore((s) => s.removeRosterEntry);
  const updateRosterEntry = useRosterStore((s) => s.updateRosterEntry);
  const addToast = useToastStore((s) => s.addToast);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);

  // Filter to active tenant
  const tenantEmployees = useMemo(
    () => employees.filter((e) => e.tenantId === activeTenantId),
    [employees, activeTenantId]
  );
  const tenantRoster = useMemo(
    () => rosterEntries.filter((r) => tenantEmployees.some((e) => e.id === r.employeeId)),
    [rosterEntries, tenantEmployees]
  );

  // Filter by date
  const filteredRoster = useMemo(() => {
    if (!selectedDate) return tenantRoster;
    return tenantRoster.filter((r) => r.date === selectedDate);
  }, [tenantRoster, selectedDate]);

  // Get employee lookup
  const employeeMap = useMemo(
    () => new Map(tenantEmployees.map((e) => [e.id, e])),
    [tenantEmployees]
  );

  const handleDelete = (id: string) => {
    removeRosterEntry(id);
    addToast("Roster entry deleted", "info");
  };

  const columns: Column[] = [
    {
      key: "employeeId",
      header: "Employee",
      sortable: true,
      render: (val: unknown) => {
        const emp = employeeMap.get(val as string);
        return emp ? <PII value={emp.name} type="name" /> : val as string;
      },
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (val: unknown) => {
        const d = val as string;
        const date = new Date(d + "T00:00:00");
        return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      },
    },
    { key: "startTime", header: "Start", sortable: true },
    { key: "endTime", header: "End", sortable: true },
    { key: "shift", header: "Shift", sortable: true,
      render: (_val: unknown, row: Record<string, unknown>) => {
        const emp = employeeMap.get(row["employeeId"] as string);
        return emp ? (
          <Badge variant={emp.shift === "NIGHT" ? "purple" : emp.shift === "DAY" ? "amber" : "blue"}>
            {emp.shift}
          </Badge>
        ) : "-";
      },
    },
    {
      key: "source",
      header: "Source",
      sortable: true,
      render: (val: unknown) => {
        const s = val as string;
        return (
          <Badge variant={s === "MANUAL_UPLOAD" ? "blue" : s === "API_PUSH" ? "green" : "purple"}>
            {s === "MANUAL_UPLOAD" ? "Upload" : s === "API_PUSH" ? "API" : "HRMS"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (_val: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHistory(row["id"] as string)}
          >
            <History className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row["id"] as string)}
            className="text-danger/70 hover:text-danger"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  // Group by date for weekly view
  const rosterByWeek = useMemo(() => {
    const groups = new Map<string, typeof tenantRoster>();
    for (const entry of tenantRoster) {
      // Get Monday of the week
      const d = new Date(entry.date + "T00:00:00");
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff)).toISOString().split("T")[0] || "";
      const existing = groups.get(monday) || [];
      existing.push(entry);
      groups.set(monday, existing);
    }
    return groups;
  }, [tenantRoster]);

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card padding="lg" header={
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-blue" />
            Roster Entries ({filteredRoster.length})
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-border rounded-lg text-sm text-text-primary"
            />
            <Button size="sm" variant="ghost" onClick={() => setSelectedDate("")}>
              Clear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowRecurring(!showRecurring)}>
              <CalendarDays className="w-3 h-3 mr-1" /> Weekly View
            </Button>
          </div>
        </div>
      }>
        {showRecurring ? (
          <div className="space-y-4">
            {Array.from(rosterByWeek.entries()).map(([monday, entries]) => (
              <div key={monday} className="bg-ops-bg rounded-lg p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">
                  Week of {new Date(monday + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — {entries.length} entries
                </p>
                <div className="flex flex-wrap gap-2">
                  {entries.slice(0, 10).map((entry) => {
                    const emp = employeeMap.get(entry.employeeId);
                    return (
                      <div key={entry.id} className="px-2 py-1 bg-white border border-border rounded text-[10px] text-text-primary">
                        <PII value={emp?.name || "Unknown"} type="name" />
                        {" "}
                        <span className="text-text-secondary">{entry.startTime}-{entry.endTime}</span>
                      </div>
                    );
                  })}
                  {entries.length > 10 && (
                    <p className="text-[10px] text-text-secondary">+{entries.length - 10} more</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRoster.map((r) => {
              const emp = employeeMap.get(r.employeeId);
              return {
                ...r,
                shift: emp?.shift || "",
              };
            }) as Record<string, unknown>[]}
            pageSize={15}
            emptyMessage={selectedDate ? `No roster entries for ${selectedDate}` : "No roster entries yet. Upload a CSV to get started."}
          />
        )}
      </Card>

      {/* Change History Modal */}
      {showHistory && (
        <Modal open={true} onClose={() => setShowHistory(null)} title="Change History" size="lg">
          <div className="space-y-3">
            {changeLogs.filter((l) => l.rosterEntryId === showHistory).length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No changes recorded for this entry</p>
            ) : (
              changeLogs
                .filter((l) => l.rosterEntryId === showHistory)
                .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
                .map((log) => (
                  <div key={log.id} className="p-3 bg-ops-bg rounded-lg border border-border text-xs space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>{new Date(log.changedAt).toLocaleString()}</span>
                      <span className="font-medium">{log.changedBy}</span>
                    </div>
                    {log.reason && <p className="text-text-primary">Reason: {log.reason}</p>}
                    <div className="text-text-primary">
                      Changed:{" "}
                      {Object.entries(log.newValues)
                        .filter(([k]) => k !== "id")
                        .map(([k, v]) => `${k}: "${v}"`)
                        .join(", ")}
                    </div>
                  </div>
                ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

RosterListTab.displayName = "RosterListTab";
