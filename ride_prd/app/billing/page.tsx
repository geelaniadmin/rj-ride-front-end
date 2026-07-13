"use client";

import React, { useState } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { BillingLedger } from "@/components/billing/BillingLedger";
import { SubVendorReconciliation } from "@/components/billing/SubVendorReconciliation";
import { CustomerStatement } from "@/components/billing/CustomerStatement";
import { VoucherManager } from "@/components/billing/VoucherManager";
import { BarChart3, FileCheck, Receipt, Ticket } from "lucide-react";

const BILLING_TABS = [
  { id: "ledger", labelKey: "ledger" as const, icon: BarChart3 },
  { id: "reconcile", labelKey: "reconciliation" as const, icon: FileCheck },
  { id: "statement", labelKey: "statement" as const, icon: Receipt },
  { id: "vouchers", labelKey: "vouchers" as const, icon: Ticket },
];

export default function BillingPage() {
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState("ledger");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{t("billingReconciliation", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("billingDescription", language)}</p>
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
              {t(tab.labelKey, language)}
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
