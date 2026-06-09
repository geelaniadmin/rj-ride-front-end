"use client";

import React, { useState } from "react";
import { BillingLedger } from "@/components/billing/BillingLedger";
import { SubVendorReconciliation } from "@/components/billing/SubVendorReconciliation";
import { CustomerStatement } from "@/components/billing/CustomerStatement";
import { VoucherManager } from "@/components/billing/VoucherManager";
import { BarChart3, FileCheck, Receipt, Ticket } from "lucide-react";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("ledger");

  const tabs = [
    { id: "ledger", label: "📊 Ledger", icon: BarChart3 },
    { id: "reconcile", label: "✔️ Reconciliation", icon: FileCheck },
    { id: "statement", label: "📄 Statement", icon: Receipt },
    { id: "vouchers", label: "🎟️ Vouchers", icon: Ticket },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Billing & Reconciliation</h1>
        <p className="text-sm text-text-secondary mt-1">Trip costing, operator fees, invoice reconciliation, customer statements, vouchers</p>
      </div>

      <div className="flex gap-1 border-b border-border pb-px">
        {tabs.map((tab) => {
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

      {activeTab === "ledger" && <BillingLedger />}
      {activeTab === "reconcile" && <SubVendorReconciliation />}
      {activeTab === "statement" && <CustomerStatement />}
      {activeTab === "vouchers" && <VoucherManager />}
    </div>
  );
}
