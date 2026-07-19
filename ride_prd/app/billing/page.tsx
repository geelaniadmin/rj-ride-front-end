"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, formatMoney, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { BarChart3, FileText, Receipt, CreditCard, ExternalLink, CheckCircle, DollarSign, XCircle } from "lucide-react";

type InvoiceDetail = components["schemas"]["InvoiceDetail"];
type InvoiceLine = components["schemas"]["InvoiceLine"];
type Statement = components["schemas"]["Statement"];
type Payout = components["schemas"]["Payout"];

const BILLING_TABS = [
  { id: "invoices", label: "Invoices", icon: BarChart3 },
  { id: "statements", label: "Statements", icon: Receipt },
  { id: "payouts", label: "Payouts", icon: CreditCard },
] as const;

type Tab = typeof BILLING_TABS[number]["id"];

function toMinor(display: string, currency: string): number {
  const n = parseFloat(display);
  if (isNaN(n)) return 0;
  const zeroDp = ["JPY", "KRW", "VND"];
  return zeroDp.includes(currency) ? Math.round(n) : Math.round(n * 100);
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("invoices");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Billing</h1>
        <p className="text-sm text-text-secondary mt-1">Invoices, statements, and payouts from the live API.</p>
      </div>

      <div className="flex gap-1 border-b border-border pb-px">
        {BILLING_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2 rounded-t-lg ${
                activeTab === tab.id
                  ? "bg-ops-sidebar text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-ops-bg"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "invoices" && <InvoicesTab />}
      {activeTab === "statements" && <StatementsTab />}
      {activeTab === "payouts" && <PayoutsTab />}
    </div>
  );
}

function InvoicesTab() {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voidModal, setVoidModal] = useState<{ id: string } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [adjustModal, setAdjustModal] = useState<{ id: string; currency: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: keys.billing.invoices.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/billing/invoices", {
        params: { query: {} },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const { data: detail } = useQuery<InvoiceDetail | null>({
    queryKey: keys.billing.invoices.detail(selectedId ?? ""),
    queryFn: async () => {
      if (!selectedId) return null;
      const { data: res, error: err } = await apiClient.GET("/v1/billing/invoices/{id}", {
        params: { path: { id: selectedId } },
      });
      if (err) throw err;
      return (res?.result ?? null) as InvoiceDetail | null;
    },
    enabled: !!selectedId,
  });

  const voidMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error: err } = await apiClient.POST("/v1/billing/invoices/{id}/void", {
        params: { path: { id } },
        body: { reason },
      });
      if (err) throw err;
    },
    onSuccess: () => {
      addToast("Invoice voided", "success");
      void qc.invalidateQueries({ queryKey: keys.billing.all() });
      setVoidModal(null);
      setVoidReason("");
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Void failed", "error");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, amountMinor, currency, reason }: { id: string; amountMinor: number; currency: string; reason: string }) => {
      const { error: err } = await apiClient.POST("/v1/billing/invoices/{id}/adjust", {
        params: { path: { id } },
        body: { amountMinor, currency, reason },
      });
      if (err) throw err;
    },
    onSuccess: () => {
      addToast("Adjustment applied", "success");
      void qc.invalidateQueries({ queryKey: keys.billing.all() });
      setAdjustModal(null);
      setAdjustAmount("");
      setAdjustReason("");
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Adjustment failed", "error");
    },
  });

  const invoices = (data?.results ?? []) as InvoiceDetail[];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-text-secondary text-center py-8">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <Card padding="lg" className="text-center py-8 text-text-secondary">No invoices yet.</Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id} padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary font-mono">{inv.id.substring(0, 12)}…</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {inv.status && <span className="mr-2">{inv.status}</span>}
                    {inv.totalMinor != null && inv.currency && (
                      <span className="font-medium text-text-primary">{formatMoney(inv.totalMinor, inv.currency)}</span>
                    )}
                    {inv.createdAt && <span className="ml-2">{new Date(inv.createdAt).toLocaleDateString()}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(inv.id === selectedId ? null : inv.id)}>
                    <FileText className="w-3 h-3 mr-1" /> Details
                  </Button>
                  {inv.status !== "VOIDED" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => setVoidModal({ id: inv.id })}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Void
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdjustModal({ id: inv.id, currency: inv.currency })}
                      >
                        <DollarSign className="w-3 h-3 mr-1" /> Adjust
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {selectedId === inv.id && detail && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {(detail.lines as InvoiceLine[] | undefined)?.map((line, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-text-secondary">{line.description ?? `Line ${i + 1}`}</span>
                      <span className="font-medium text-text-primary">
                        {line.amountMinor != null && detail.currency
                          ? formatMoney(line.amountMinor, detail.currency)
                          : "—"}
                      </span>
                    </div>
                  ))}
                  {detail.totalMinor != null && detail.currency && (
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                      <span>Total</span>
                      <span>{formatMoney(detail.totalMinor, detail.currency)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {voidModal && (
        <Modal open title="Void Invoice" onClose={() => { setVoidModal(null); setVoidReason(""); }}>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Provide a reason for voiding this invoice.</p>
            <FormField label="Reason">
              <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Duplicate invoice" />
            </FormField>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1 text-danger"
                disabled={!voidReason.trim() || voidMutation.isPending}
                onClick={() => voidMutation.mutate({ id: voidModal.id, reason: voidReason.trim() })}
              >
                {voidMutation.isPending ? "Voiding…" : "Confirm Void"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setVoidModal(null); setVoidReason(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {adjustModal && (
        <Modal open title="Adjust Invoice" onClose={() => { setAdjustModal(null); setAdjustAmount(""); setAdjustReason(""); }}>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Enter a signed amount (negative for credit, positive for debit) and reason.</p>
            <FormField label={`Amount (${adjustModal.currency})`}>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="-50.00"
              />
            </FormField>
            <FormField label="Reason">
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Toll correction" />
            </FormField>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                disabled={!adjustAmount || !adjustReason.trim() || adjustMutation.isPending}
                onClick={() =>
                  adjustMutation.mutate({
                    id: adjustModal.id,
                    amountMinor: toMinor(adjustAmount, adjustModal.currency),
                    currency: adjustModal.currency,
                    reason: adjustReason.trim(),
                  })
                }
              >
                {adjustMutation.isPending ? "Applying…" : "Apply Adjustment"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setAdjustModal(null); setAdjustAmount(""); setAdjustReason(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatementsTab() {
  const addToast = useToastStore((s) => s.addToast);

  const { data, isLoading } = useQuery({
    queryKey: keys.billing.statements.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/billing/statements", {
        params: { query: {} },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: res, error: err } = await apiClient.GET("/v1/billing/statements/{id}/download", {
        params: { path: { id } },
      });
      if (err) throw err;
      return res?.result?.url;
    },
    onSuccess: (url) => {
      if (url) window.open(url, "_blank");
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Download failed", "error");
    },
  });

  const statements = (data?.results ?? []) as Statement[];

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-text-secondary text-center py-8">Loading statements…</p>
      ) : statements.length === 0 ? (
        <Card padding="lg" className="text-center py-8 text-text-secondary">No statements yet.</Card>
      ) : (
        statements.map((stmt) => (
          <Card key={stmt.id} padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {stmt.periodStart && stmt.periodEnd
                    ? `${new Date(stmt.periodStart).toLocaleDateString()} – ${new Date(stmt.periodEnd).toLocaleDateString()}`
                    : stmt.id}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {stmt.totalMinor != null && stmt.currency && formatMoney(stmt.totalMinor, stmt.currency)}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadMutation.mutate(stmt.id)}
                disabled={downloadMutation.isPending}
              >
                <ExternalLink className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function PayoutsTab() {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: keys.billing.payouts.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/billing/payouts", {
        params: { query: {} },
      });
      if (err) throw err;
      return res?.result;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.POST("/v1/billing/payouts/{id}/approve", {
        params: { path: { id } },
      });
      if (err) throw err;
    },
    onSuccess: () => {
      addToast("Payout approved", "success");
      void qc.invalidateQueries({ queryKey: keys.billing.payouts.list({}) });
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Approve failed", "error");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.POST("/v1/billing/payouts/{id}/mark-paid", {
        params: { path: { id } },
      });
      if (err) throw err;
    },
    onSuccess: () => {
      addToast("Payout marked as paid", "success");
      void qc.invalidateQueries({ queryKey: keys.billing.payouts.list({}) });
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Mark paid failed", "error");
    },
  });

  const payouts = (data?.results ?? []) as Payout[];

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-text-secondary text-center py-8">Loading payouts…</p>
      ) : payouts.length === 0 ? (
        <Card padding="lg" className="text-center py-8 text-text-secondary">No payouts yet.</Card>
      ) : (
        payouts.map((payout) => (
          <Card key={payout.id} padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {payout.amountMinor != null && payout.currency
                    ? formatMoney(payout.amountMinor, payout.currency)
                    : payout.id}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {payout.status && (
                    <Badge
                      variant={payout.status === "PAID" ? "green" : payout.status === "APPROVED" ? "blue" : "amber"}
                      className="mr-2"
                    >
                      {payout.status}
                    </Badge>
                  )}
                  {payout.reference && <span>{payout.reference}</span>}
                  {payout.paidAt && <span className="ml-2">Paid {new Date(payout.paidAt).toLocaleDateString()}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {payout.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => approveMutation.mutate(payout.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                )}
                {payout.status === "APPROVED" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => markPaidMutation.mutate(payout.id)}
                    disabled={markPaidMutation.isPending}
                  >
                    <DollarSign className="w-3 h-3 mr-1" /> Mark Paid
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
