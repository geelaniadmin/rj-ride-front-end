"use client";

import React, { useState } from "react";
import { WebhookConfig } from "@/components/api-console/WebhookConfig";
import { ApiTester } from "@/components/api-console/ApiTester";
import { WebhookLogs } from "@/components/api-console/WebhookLogs";
import { ApiDocumentation } from "@/components/api-console/ApiDocumentation";
import { QuoteBookConfirmStepper } from "@/components/partner-api/QuoteBookConfirmStepper";
import { BookOpen, Beaker, Webhook, ListChecks, ShoppingCart } from "lucide-react";

export default function APIConsolePage() {
  const [activeTab, setActiveTab] = useState("docs");

  const tabs = [
    { id: "docs", label: "📚 Documentation", icon: BookOpen },
    { id: "stepper", label: "🛒 Quote→Book→Confirm", icon: ShoppingCart },
    { id: "test", label: "🧪 API Tester", icon: Beaker },
    { id: "webhooks", label: "🪝 Webhooks", icon: Webhook },
    { id: "logs", label: "📋 Logs", icon: ListChecks },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Partner API Console</h1>
        <p className="text-sm text-text-secondary mt-1">Integrate with RIDE via REST API and webhooks</p>
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

      {activeTab === "docs" && <ApiDocumentation />}
      {activeTab === "stepper" && <QuoteBookConfirmStepper />}
      {activeTab === "test" && <ApiTester />}
      {activeTab === "webhooks" && <WebhookConfig />}
      {activeTab === "logs" && <WebhookLogs />}
    </div>
  );
}
