"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { RosterUploadTab } from "@/components/rosters/RosterUploadTab";
import { RosterListTab } from "@/components/rosters/RosterListTab";
import { EmployeeListTab } from "@/components/rosters/EmployeeListTab";
import { RosterApiConfigTab } from "@/components/rosters/RosterApiConfigTab";
import { Upload, Calendar, Users, Code2 } from "lucide-react";

const TABS = [
  { id: "upload", label: "Upload Roster", icon: Upload },
  { id: "roster", label: "Roster", icon: Calendar },
  { id: "employees", label: "Employees", icon: Users },
  { id: "api-config", label: "API & Connectors", icon: Code2 },
];

export default function RostersPage() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Roster Management</h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload, manage, and sync employee rosters for route planning
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "upload" && <RosterUploadTab />}
        {activeTab === "roster" && <RosterListTab />}
        {activeTab === "employees" && <EmployeeListTab />}
        {activeTab === "api-config" && <RosterApiConfigTab />}
      </Tabs>
    </div>
  );
}
