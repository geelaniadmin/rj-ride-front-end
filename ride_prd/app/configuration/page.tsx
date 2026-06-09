"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { VendorsTab } from "@/components/configuration/VendorsTab";
import { CustomersTab } from "@/components/configuration/CustomersTab";
import { VehicleTypesTab } from "@/components/configuration/VehicleTypesTab";
import { VehiclesTab } from "@/components/configuration/VehiclesTab";
import { DriversTab } from "@/components/configuration/DriversTab";
import { AddonsTab } from "@/components/configuration/AddonsTab";

const TABS = [
  { id: "vendors", label: "Vendors" },
  { id: "customers", label: "Customers" },
  { id: "vehicle-types", label: "Vehicle Types" },
  { id: "vehicles", label: "Vehicles" },
  { id: "drivers", label: "Drivers" },
  { id: "addons", label: "Add-ons" },
];

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState("vendors");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">Manage vendors, customers, fleet, drivers, and services</p>
      </div>

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
        {activeTab === "vendors" && <VendorsTab searchQuery={searchQuery} />}
        {activeTab === "customers" && <CustomersTab searchQuery={searchQuery} />}
        {activeTab === "vehicle-types" && <VehicleTypesTab searchQuery={searchQuery} />}
        {activeTab === "vehicles" && <VehiclesTab searchQuery={searchQuery} />}
        {activeTab === "drivers" && <DriversTab searchQuery={searchQuery} />}
        {activeTab === "addons" && <AddonsTab searchQuery={searchQuery} />}
      </Tabs>
    </div>
  );
}
