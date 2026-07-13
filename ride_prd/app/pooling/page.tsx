"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { PoolingDashboard } from "@/components/pooling/PoolingDashboard";
import { PoolingResultsTab } from "@/components/pooling/PoolingResultsTab";
import { Settings, Route } from "lucide-react";

const TABS = [
  { id: "config", label: "Pooling Config", icon: Settings },
  { id: "results", label: "Plan & Results", icon: Route },
];

export default function PoolingPage() {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Route Planning & Pooling</h1>
        <p className="text-sm text-text-secondary mt-1">
          Cluster employees into shared trips with optimized multi-stop routes
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "config" && <PoolingDashboard />}
        {activeTab === "results" && <PoolingResultsTab />}
      </Tabs>
    </div>
  );
}
