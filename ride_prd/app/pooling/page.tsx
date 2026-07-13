"use client";

import React, { useState } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { Tabs } from "@/components/ui/Tabs";
import { PoolingDashboard } from "@/components/pooling/PoolingDashboard";
import { PoolingResultsTab } from "@/components/pooling/PoolingResultsTab";
import { Settings, Route } from "lucide-react";

const POOLING_TABS = [
  { id: "config", labelKey: "poolingConfig" as const, icon: Settings },
  { id: "results", labelKey: "planResults" as const, icon: Route },
];

export default function PoolingPage() {
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{t("routePlanningPooling", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("poolingDescription", language)}</p>
      </div>

      <Tabs tabs={POOLING_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey, language) }))} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "config" && <PoolingDashboard />}
        {activeTab === "results" && <PoolingResultsTab />}
      </Tabs>
    </div>
  );
}
