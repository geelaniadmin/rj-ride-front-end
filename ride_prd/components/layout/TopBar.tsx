"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useAuth, useLanguageStore, t } from "@ride/shared";
import { PII } from "@/components/ui/PII";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const language = useLanguageStore((s) => s.language);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "Op";

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="h-16 border-b border-white/10 bg-ops-sidebar/95 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-white">{t("rideTM", language)}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          {user?.email ? (
            <PII value={user.email} type="email" className="text-white" />
          ) : (
            <span className="text-sm text-white/70">—</span>
          )}
          {user?.role && (
            <span className="text-xs text-white/50 font-mono">{user.role}</span>
          )}
          <button
            onClick={handleLogout}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <LanguageToggle />

        {user?.tenantId && (
          <div className="ml-4 px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white/70 font-mono">
            {user.tenantId}
          </div>
        )}
      </div>
    </header>
  );
};

TopBar.displayName = "TopBar";
