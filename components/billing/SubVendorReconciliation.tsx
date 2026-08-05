"use client";

import React, { useRef, useState, useMemo } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToastStore } from "@/stores/toastStore";
import { Upload, CheckCircle, AlertCircle, RotateCw } from "lucide-react";

export const SubVendorReconciliation: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSubVendorInvoice = useBillingStore((s) => s.uploadSubVendorInvoice);
  const reconcileInvoice = useBillingStore((s) => s.reconcileInvoice);
  const allInvoices = useBillingStore((s) => s.subVendorInvoices);
  const allReconciliations = useBillingStore((s) => s.reconciliations);
  const addToast = useToastStore((s) => s.addToast);

  const invoices = useMemo(() => allInvoices, [allInvoices]);
  const reconciliations = useMemo(() => allReconciliations, [allReconciliations]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    vendorId: "V1",
    invoiceNumber: "",
  });

  const stats = useMemo(() => {
    const allMatches = reconciliations;
    return {
      total: invoices.length,
      matched: allMatches.filter((m) => m.matched).length,
      disputed: allMatches.filter((m) => !m.matched).length,
      matchRate: allMatches.length > 0 ? ((allMatches.filter((m) => m.matched).length / allMatches.length) * 100).toFixed(1) : "0",
    };
  }, [invoices, reconciliations]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");

      // Parse mock CSV: tripId,amount,currency
      const items = lines
        .slice(1) // Skip header
        .filter((l) => l.trim())
        .map((line, idx) => {
          const [tripId = "", amountStr = "0", currency = "INR"] = line.split(",").map((s) => s.trim());
          return {
            invoiceLineId: `ILI-${idx}`,
            tripId,
            amount: parseFloat(amountStr) || 0,
            currency,
          };
        });

      if (items.length === 0) {
        addToast("No valid items in invoice", "error");
        return;
      }

      uploadSubVendorInvoice({
        vendorId: invoiceForm.vendorId,
        invoiceNumber: invoiceForm.invoiceNumber || `INV-${Date.now()}`,
        fileName: file.name,
        items,
      });

      addToast(`Invoice uploaded with ${items.length} items`, "success");
      setInvoiceForm({ vendorId: "V1", invoiceNumber: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      addToast("Error parsing invoice file", "error");
    }
  };

  const handleReconcile = (invoiceId: string) => {
    const matches = reconcileInvoice(invoiceId);
    addToast(`Reconciliation complete: ${matches.filter((m) => m.matched).length} matched`, "success");
  };

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);
  const selectedMatches = selectedInvoiceId
    ? reconciliations.filter((r) => {
        const inv = invoices.find((i) => i.id === selectedInvoiceId);
        return inv?.items.some((item) => item.invoiceLineId === r.invoiceLineId);
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Invoices</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Matched</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.matched}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Disputed</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.disputed}</p>
        </div>
        <div className="bg-ops-sidebar border border-ops-sidebar rounded-xl shadow-lg p-4">
          <p className="text-xs font-medium text-white/60">Match Rate</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.matchRate}%</p>
        </div>
      </div>

      {/* Upload Form */}
      <Card padding="lg" header={<h3 className="font-semibold">📤 Upload Sub-Vendor Invoice</h3>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vendor ID" required>
              <Input value={invoiceForm.vendorId} onChange={(e) => setInvoiceForm((p) => ({ ...p, vendorId: e.target.value }))} />
            </FormField>
            <FormField label="Invoice Number" required>
              <Input
                placeholder="e.g., INV-2025-001"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Invoice File (CSV)" required hint="Format: tripId,amount,currency">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-1 px-3 py-2 bg-ops-bg border border-border rounded text-text-primary text-sm"
              />
              <Button variant="secondary">
                <Upload className="w-4 h-4 mr-1" /> Choose
              </Button>
            </div>
          </FormField>

          <p className="text-xs text-text-secondary italic">Upload CSV with headers: tripId, amount, currency</p>
        </div>
      </Card>

      {/* Invoice List */}
      <Card padding="lg" header={<h3 className="font-semibold">📋 Uploaded Invoices</h3>}>
        {invoices.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">No invoices uploaded</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const invoiceMatches = reconciliations.filter((r) => invoice.items.some((item) => item.invoiceLineId === r.invoiceLineId));
              const matchedCount = invoiceMatches.filter((m) => m.matched).length;

              return (
                <div key={invoice.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-text-secondary">{invoice.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {invoiceMatches.length > 0 ? (
                        <Badge variant={matchedCount === invoiceMatches.length ? "green" : "amber"}>
                          {matchedCount} / {invoiceMatches.length} matched
                        </Badge>
                      ) : (
                        <Badge variant="amber">Not reconciled</Badge>
                      )}
                      <button onClick={() => setSelectedInvoiceId(invoice.id)} className="text-indigo-400 hover:text-indigo-300">
                        View
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-text-secondary">
                    {invoice.items.length} items | Vendor: {invoice.vendorId}
                  </div>

                  {invoiceMatches.length === 0 && (
                    <Button
                      onClick={() => handleReconcile(invoice.id)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <RotateCw className="w-3 h-3 mr-1" /> Reconcile
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Reconciliation Details */}
      {selectedInvoice && selectedMatches.length > 0 && (
        <Card padding="lg" header={<h3 className="font-semibold">✔️ Reconciliation Details</h3>}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedMatches.map((match) => {
              const item = selectedInvoice.items.find((i) => i.invoiceLineId === match.invoiceLineId);
              return (
                <div key={match.invoiceLineId} className="p-2 bg-ops-sidebar rounded border-l-2 border-border space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">Trip: {match.tripId}</span>
                    {match.matched ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-text-secondary">
                    <div>
                      Invoice: {item?.currency} {item?.amount.toLocaleString()}
                    </div>
                    <div>
                      System: {item?.currency} {match.systemAmount.toLocaleString()}
                    </div>
                  </div>
                  {match.reason && <p className="text-red-400 italic">{match.reason}</p>}
                </div>
              );
            })}
          </div>

          <button onClick={() => setSelectedInvoiceId(null)} className="text-sm text-text-secondary hover:text-text-primary mt-3">
            Close
          </button>
        </Card>
      )}
    </div>
  );
};

SubVendorReconciliation.displayName = "SubVendorReconciliation";
