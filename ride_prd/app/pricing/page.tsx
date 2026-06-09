"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { RateCardsTab } from "@/components/pricing/RateCardsTab";
import { QuoteSimulatorTab } from "@/components/pricing/QuoteSimulatorTab";

const TABS = [
  { id: "rate-cards", label: "Rate Cards" },
  { id: "simulator", label: "Quote Simulator" },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState("rate-cards");
  const [cacheMode, setCacheMode] = useState<"linked" | "cached">("linked");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Pricing & Quotes</h1>
          <p className="text-sm text-text-secondary mt-1">Pre-negotiated rate cards and dynamic quotes</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-ops-bg rounded border border-border">
          <span className="text-xs text-text-secondary">Engine:</span>
          <button
            onClick={() => setCacheMode(cacheMode === "linked" ? "cached" : "linked")}
            className="text-xs font-medium text-brand-blue hover:text-brand-blue/80"
          >
            {cacheMode === "linked" ? "Linked ⟷ Cache" : "Cache (Synced)"}
          </button>
        </div>
      </div>

      <Card padding="md" className="bg-brand-blue/10 border-brand-blue/30">
        <p className="text-xs text-text-primary">
          <span className="font-semibold">Price Lock Design:</span> Because prices are locked at quote time (Phase 3), cache/engine
          divergence does not affect booked orders. Each order cites a frozen `priceId` and `rateCardVersion`.
        </p>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          placeholder="Search this module..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        />
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "rate-cards" && <RateCardsTab searchQuery={searchQuery} />}
        {activeTab === "simulator" && <QuoteSimulatorTab searchQuery={searchQuery} />}
      </Tabs>
    </div>
  );
}
