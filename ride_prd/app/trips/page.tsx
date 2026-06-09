"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { TripsListTab } from "@/components/trips/TripsListTab";
import { ManualTripCreation } from "@/components/trips/ManualTripCreation";
import { BulkUploadCreation } from "@/components/trips/BulkUploadCreation";
import { ApiPaxCreation } from "@/components/trips/ApiPaxCreation";
import { ApiVehicleCountCreation } from "@/components/trips/ApiVehicleCountCreation";
import { RecurringCreation } from "@/components/trips/RecurringCreation";
import { CloneCreation } from "@/components/trips/CloneCreation";

const TABS = [{ id: "list", label: "Trip Requests" }];

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMethod, setCreationMethod] = useState<"MANUAL" | "BULK_UPLOAD" | "API_PAX" | "API_VEHICLE_COUNT" | "RECURRING" | "CLONE" | null>(null);

  const handleTripCreated = () => {
    setShowCreateModal(false);
    setCreationMethod(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Trip Requests</h1>
          <p className="text-sm text-text-secondary mt-1">Manage convoy-based transport requests with price-locked booking</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary">
          New Trip Request
        </Button>
      </div>

      <Card padding="md" className="bg-brand-blue/5 border-brand-blue/20">
        <p className="text-xs text-text-tertiary">
          <span className="font-semibold text-brand-blue">Convoy Model:</span> All vehicles share the same stop sequence. Each vehicle is independently quoted and
          booked against a frozen `priceId`. Confirm is blocked until every vehicle has a valid, unexpired offer.
        </p>
      </Card>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "list" && <TripsListTab />}
      </Tabs>

      <Drawer open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Trip Request" width="2xl">
        {!creationMethod ? (
          <div className="flex flex-col justify-center h-full space-y-4 px-2">
            <p className="text-sm text-text-secondary text-center mb-2">Choose how to create this trip:</p>
            <Button onClick={() => setCreationMethod("MANUAL")} variant="primary" className="w-full justify-start py-3">
              Manual Entry
            </Button>
            <Button onClick={() => setCreationMethod("BULK_UPLOAD")} variant="secondary" className="w-full justify-start py-3">
              Bulk Upload (CSV)
            </Button>
            <Button onClick={() => setCreationMethod("API_PAX")} variant="secondary" className="w-full justify-start py-3">
              API — Pax-based (RISMA/ROMA)
            </Button>
            <Button onClick={() => setCreationMethod("API_VEHICLE_COUNT")} variant="secondary" className="w-full justify-start py-3">
              API — Vehicle Count
            </Button>
            <Button onClick={() => setCreationMethod("RECURRING")} variant="secondary" className="w-full justify-start py-3">
              Recurring Generator
            </Button>
            <Button onClick={() => setCreationMethod("CLONE")} variant="secondary" className="w-full justify-start py-3">
              Clone Existing Trip
            </Button>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <button
              onClick={() => setCreationMethod(null)}
              className="text-sm text-brand-blue hover:text-brand-blue/80 mb-4 self-start"
            >
              ← Back to methods
            </button>
            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              {creationMethod === "MANUAL" && <ManualTripCreation onCreated={handleTripCreated} />}
              {creationMethod === "BULK_UPLOAD" && <BulkUploadCreation onCreated={handleTripCreated} />}
              {creationMethod === "API_PAX" && <ApiPaxCreation onCreated={handleTripCreated} />}
              {creationMethod === "API_VEHICLE_COUNT" && <ApiVehicleCountCreation onCreated={handleTripCreated} />}
              {creationMethod === "RECURRING" && <RecurringCreation onCreated={handleTripCreated} />}
              {creationMethod === "CLONE" && <CloneCreation onCreated={handleTripCreated} />}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
