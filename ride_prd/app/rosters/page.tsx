"use client";

import React, { useState } from "react";
import { useLanguageStore, t } from "@ride/shared";
import { Tabs } from "@/components/ui/Tabs";
import { RosterUploadTab } from "@/components/rosters/RosterUploadTab";
import { RosterListTab } from "@/components/rosters/RosterListTab";
import { EmployeeListTab } from "@/components/rosters/EmployeeListTab";
import { RosterApiConfigTab } from "@/components/rosters/RosterApiConfigTab";
import { Upload, Calendar, Users, Code2 } from "lucide-react";

const ROSTER_TABS = [
  { id: "upload", labelKey: "uploadRoster" as const, icon: Upload },
  { id: "roster", labelKey: "roster" as const, icon: Calendar },
  { id: "employees", labelKey: "employees" as const, icon: Users },
  { id: "api-config", labelKey: "apiConnectors" as const, icon: Code2 },
];

export default function RostersPage() {
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{t("rosterManagement", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("rosterDescription", language)}</p>
      </div>

      <Tabs tabs={ROSTER_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey, language) }))} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === "upload" && <RosterUploadTab />}
        {activeTab === "roster" && <RosterListTab />}
        {activeTab === "employees" && <EmployeeListTab />}
        {activeTab === "api-config" && <RosterApiConfigTab />}
      </Tabs>
    </div>
  );
}
