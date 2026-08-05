"use client";

import React, { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useTenantStore } from "@ride/shared";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";

export const TopBar: React.FC = () => {
  const { tenants, activeTenantId, setActiveTenant, getActiveTenant } = useTenantStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeTenant = getActiveTenant();

  return (
    <header className="h-16 border-b border-white/10 bg-ops-sidebar/95 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-white">RIDE</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white"
          >
            <span className="text-sm">
              {activeTenant?.name || "Select Tenant"}
            </span>
            <Badge variant="blue" className="text-xs">
              {activeTenant?.contractCurrency || ""}
            </Badge>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-border rounded-xl shadow-lg min-w-48 z-50 overflow-hidden">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    setActiveTenant(tenant.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    tenant.id === activeTenantId
                      ? "bg-brand-blue text-white"
                      : "text-text-primary hover:bg-ops-bg"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{tenant.name}</span>
                    <span className="text-xs text-text-secondary">{tenant.baseCity}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold">
            Op
          </div>
          <PII value="operator@ride.local" type="email" className="text-white" />
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <LogOut className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="ml-4 px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white/70 font-mono">
          {activeTenantId}
        </div>
      </div>
    </header>
  );
};

TopBar.displayName = "TopBar";
