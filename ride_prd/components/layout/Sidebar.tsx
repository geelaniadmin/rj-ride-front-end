"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguageStore, t } from "@ride/shared";
import {
  LayoutDashboard,
  Settings2,
  Tags,
  Route,
  Radio,
  MapPin,
  Receipt,
  Code2,
  ClipboardList,
  GitBranch,
} from "lucide-react";

const NAV_ITEMS = [
  { labelKey: "dashboard" as const, icon: LayoutDashboard, href: "/" },
  { labelKey: "configuration" as const, icon: Settings2, href: "/configuration" },
  { labelKey: "pricingAndQuotes" as const, icon: Tags, href: "/pricing" },
  { labelKey: "tripRequests" as const, icon: Route, href: "/trips" },
  { labelKey: "dispatch" as const, icon: Radio, href: "/dispatch" },
  { labelKey: "tracking" as const, icon: MapPin, href: "/tracking" },
{ labelKey: "rosters" as const, icon: ClipboardList, href: "/rosters" },
  { labelKey: "pooling" as const, icon: GitBranch, href: "/pooling" },
  { labelKey: "billing" as const, icon: Receipt, href: "/billing" },
  { labelKey: "apiConsole" as const, icon: Code2, href: "/api-console" },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const language = useLanguageStore((s) => s.language);

  return (
    <aside className="w-60 bg-ops-sidebar border-r border-border h-screen flex flex-col shadow-lg">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">{t('rideTM', language)}</h1>
        <p className="text-xs text-white/60 mt-1">{t('transportManagement', language)}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? "bg-brand-blue text-white font-medium shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{t(item.labelKey, language)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/50 text-center">
          <p className="font-medium text-white/80">RIDE</p>
          <p>Transport Management</p>
        </div>
      </div>
    </aside>
  );
};

Sidebar.displayName = "Sidebar";
