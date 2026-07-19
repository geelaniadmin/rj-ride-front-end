"use client";

import React, { useState } from "react";
import { useTenantStore } from "@/stores/tenantStore";
import { useRosterStore } from "@/stores/rosterStore";
import { useToastStore } from "@/stores/toastStore";
import { parseRosterCSV, generateRosterTemplate, ParsedRosterRow } from "@/lib/rosterParser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Upload, Download, Users, CheckCircle, AlertCircle } from "lucide-react";
import { PII } from "@/components/ui/PII";

export const RosterUploadTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const addEmployee = useRosterStore((s) => s.addEmployee);
  const addRosterEntry = useRosterStore((s) => s.addRosterEntry);
  const addUpload = useRosterStore((s) => s.addUpload);
  const addToast = useToastStore((s) => s.addToast);

  const [parsedRows, setParsedRows] = useState<ParsedRosterRow[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const rows = parseRosterCSV(content);
        setParsedRows(rows);
        const validCount = rows.filter((r) => r.errors.length === 0).length;
        addToast(`Parsed ${validCount} valid rows out of ${rows.length}`, "info");
      } catch (err) {
        addToast(`Error parsing file: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = generateRosterTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCommit = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      addToast("No valid rows to commit", "error");
      return;
    }

    setIsCommitting(true);
    try {
      let created = 0;
      const errors: string[] = [];

      for (const row of validRows) {
        if (!row.employee || !row.roster) continue;

        try {
          const empWithTenant = { ...row.employee, tenantId: activeTenantId };
          const employeeId = addEmployee(empWithTenant);

          addRosterEntry({
            tenantId: activeTenantId,
            employeeId,
            date: row.roster.date,
            startTime: row.roster.startTime,
            endTime: row.roster.endTime,
            source: "MANUAL_UPLOAD",
          });

          created++;
        } catch (err) {
          errors.push(`Row ${row.index}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      // Record upload
      if (created > 0) {
        addUpload({
          tenantId: activeTenantId,
          fileName: "roster-upload.csv",
          totalRows: parsedRows.length,
          validRows: created,
          errorRows: parsedRows.length - created,
          source: "MANUAL_UPLOAD",
        });
        addToast(`Created ${created} roster entries`, "success");
      }

      if (errors.length > 0) {
        addToast(`${errors.length} rows failed`, "error");
      }

      if (created > 0) setParsedRows([]);
    } finally {
      setIsCommitting(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const columns: Column[] = [
    { key: "index", header: "Row", sortable: true },
    { key: "name", header: "Name", sortable: true, render: (val: unknown): React.ReactNode => <PII value={val as string} type="name" /> },
    { key: "employeeId", header: "Employee ID", sortable: true },
    { key: "shift", header: "Shift", sortable: true },
    { key: "officeZone", header: "Zone", sortable: true },
    { key: "date", header: "Date", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (_val: unknown, row: Record<string, unknown>) => {
        const errors = row["errors"] as string[] | undefined;
        return errors && errors.length > 0 ? (
          <Badge variant="red">Invalid</Badge>
        ) : (
          <Badge variant="green">Valid</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card padding="lg" header={
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-blue" />
            Upload Roster CSV
          </h3>
          <Button size="sm" variant="ghost" onClick={handleDownloadTemplate}>
            <Download className="w-3 h-3 mr-1" /> Template
          </Button>
        </div>
      }>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Upload a CSV file with employee roster data. Required columns: employee_id, name, phone, gender, home_address, home_lat, home_lng, office_address, office_lat, office_lng, shift, date, start_time, end_time
          </p>
          <p className="text-xs text-text-secondary">
            Optional columns: email, office_zone, safety_flags (semicolon-separated: LONE_FEMALE;NIGHT_SHIFT;SPECIAL_NEEDS;SENSITIVE)
          </p>

          <label className="block">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
              <p className="text-sm text-text-primary mb-1">Click to select CSV file</p>
              <p className="text-xs text-text-secondary">or drag and drop</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </Card>

      {/* Preview */}
      {parsedRows.length > 0 && (
        <Card padding="lg" header={
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-blue" />
            Preview ({parsedRows.length} rows)
          </h3>
        }>
          <div className="space-y-4">
            {validRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium text-green-400">
                    Valid rows: {validRows.length} — {validRows.length} employees & {validRows.length} roster entries
                  </p>
                </div>
                <DataTable
                  columns={columns}
                  data={validRows.map((r) => ({
                    index: r.index,
                    name: r.employee?.name || "",
                    employeeId: r.employee?.employeeId || "",
                    shift: r.employee?.shift || "",
                    officeZone: r.employee?.officeZone || "",
                    date: r.roster?.date || "",
                    errors: r.errors,
                  })) as Record<string, unknown>[]}
                  pageSize={5}
                  emptyMessage="No valid rows"
                />
              </div>
            )}

            {invalidRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-medium text-red-400">Invalid rows: {invalidRows.length}</p>
                </div>
                <div className="space-y-2">
                  {invalidRows.map((row) => (
                    <div key={row.index} className="p-3 bg-red-900/20 border border-red-700/40 rounded text-xs">
                      <p className="font-medium text-red-300">Row {row.index}:</p>
                      <ul className="mt-1 list-disc list-inside text-red-200 space-y-1">
                        {row.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Commit */}
      {validRows.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleCommit} variant="primary" loading={isCommitting}>
            Create {validRows.length} Roster Entr{validRows.length !== 1 ? "ies" : "y"}
          </Button>
          <Button onClick={() => setParsedRows([])} variant="secondary">
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

RosterUploadTab.displayName = "RosterUploadTab";
