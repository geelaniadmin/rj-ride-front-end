"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Upload, CheckCircle, XCircle, ArrowRight } from "lucide-react";

type BulkRow = components["schemas"]["BulkRow"];
type BulkRowVerdict = components["schemas"]["BulkRowVerdict"];
type BulkValidateResult = components["schemas"]["BulkValidateResult"];

type Phase = "upload" | "verdict" | "done";

function parseCsv(text: string): BulkRow[] {
  const lines = text.trim().split("\n");
  return lines.slice(1).map((line, idx) => {
    const parts = line.split(",").map((p) => p.trim());
    return {
      rowIndex: idx + 1,
      customerId: parts[0] ?? "",
      pickupAddress: parts[1] ?? "",
      dropAddress: parts[2] ?? "",
      scheduleDate: parts[3] ?? "",
      vehicleTypes: (parts[4] ?? "").split("|").filter(Boolean),
      reference: parts[5] ?? undefined,
    };
  });
}

export const BulkUploadCreation: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("upload");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [verdicts, setVerdicts] = useState<BulkRowVerdict[]>([]);
  const [validateResult, setValidateResult] = useState<BulkValidateResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const validateMutation = useMutation({
    mutationFn: async (data: BulkRow[]) => {
      const { data: res, error: err } = await apiClient.POST("/v1/trips/bulk-validate", {
        body: { rows: data },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (result) => {
      if (!result) return;
      setVerdicts(result.verdicts);
      setValidateResult(result);
      const validRows = new Set(
        result.verdicts.filter((v) => v.valid).map((v) => v.rowIndex)
      );
      setSelectedRows(validRows);
      setPhase("verdict");
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Validation failed", "error");
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      const commitRows = verdicts
        .filter((v) => v.valid && selectedRows.has(v.rowIndex))
        .map((v) => ({
          rowIndex: v.rowIndex,
          priceIds: (v.offers ?? []).map((o) => o.priceId),
        }));

      const { data: res, error: err } = await apiClient.POST("/v1/trips/bulk-commit", {
        body: { rows: commitRows },
      });
      if (err) throw err;
      return res?.result;
    },
    onSuccess: (result) => {
      addToast(`${result?.created?.length ?? 0} trips created`, "success");
      void qc.invalidateQueries({ queryKey: keys.trips.all() });
      setPhase("done");
      onDone?.();
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Commit failed", "error");
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setRows(parsed);
      validateMutation.mutate(parsed);
    };
    reader.readAsText(file);
  };

  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (phase === "done") {
    return (
      <Card padding="lg" className="text-center py-8 space-y-3">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-text-primary">Bulk trips created!</p>
        <Button onClick={() => { setPhase("upload"); setRows([]); setVerdicts([]); setValidateResult(null); }}>
          Upload another
        </Button>
      </Card>
    );
  }

  if (phase === "verdict") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Validation Results</h3>
          <div className="flex gap-2 text-xs text-text-secondary">
            <span className="text-green-400">{validateResult?.validCount ?? 0} valid</span>
            <span>·</span>
            <span className="text-danger">{validateResult?.invalidCount ?? 0} invalid</span>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {verdicts.map((verdict) => (
            <div key={verdict.rowIndex} className={`p-3 rounded border text-xs ${verdict.valid ? "border-green-700/40 bg-green-900/10" : "border-danger/30 bg-danger/5"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {verdict.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-danger" />
                  )}
                  <span className="font-medium">Row {verdict.rowIndex}</span>
                </div>
                {verdict.valid && (
                  <input
                    type="checkbox"
                    checked={selectedRows.has(verdict.rowIndex)}
                    onChange={() => toggleRow(verdict.rowIndex)}
                    className="w-4 h-4"
                  />
                )}
              </div>
              {verdict.errors && verdict.errors.length > 0 && (
                <ul className="mt-1 pl-6 space-y-0.5 text-danger">
                  {verdict.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {verdict.valid && verdict.offers && verdict.offers.length > 0 && (
                <p className="mt-1 text-green-300 pl-6">{verdict.offers.length} offer(s) available</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => setPhase("upload")} variant="secondary">Back</Button>
          <Button
            onClick={() => commitMutation.mutate()}
            variant="primary"
            disabled={selectedRows.size === 0 || commitMutation.isPending}
            className="flex-1"
          >
            {commitMutation.isPending ? "Creating…" : `Commit ${selectedRows.size} trip(s)`} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="lg" className="border-dashed text-center space-y-3 py-8">
        <Upload className="w-8 h-8 mx-auto text-text-secondary" />
        <p className="text-sm text-text-secondary">
          Upload a CSV file with columns:<br />
          <code className="text-xs">customerId, pickupAddress, dropAddress, scheduleDate, vehicleTypes(|sep), reference</code>
        </p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleFile}
            disabled={validateMutation.isPending}
          />
          <span className={`inline-flex items-center px-4 py-2 rounded text-sm font-medium border border-border bg-white text-text-primary cursor-pointer ${validateMutation.isPending ? "opacity-50 pointer-events-none" : "hover:bg-ops-bg"}`}>
            {validateMutation.isPending ? "Validating…" : "Choose CSV File"}
          </span>
        </label>
      </Card>
    </div>
  );
};

BulkUploadCreation.displayName = "BulkUploadCreation";
