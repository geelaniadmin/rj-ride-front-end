"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings2,
  Tags,
  Route,
  Radio,
  MapPin,
  Smartphone,
  Receipt,
  Code2,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Configuration", icon: Settings2, href: "/configuration" },
  { label: "Pricing & Quotes", icon: Tags, href: "/pricing" },
  { label: "Trip Requests", icon: Route, href: "/trips" },
  { label: "Dispatch", icon: Radio, href: "/dispatch" },
  { label: "Tracking", icon: MapPin, href: "/tracking" },
  { label: "Driver App", icon: Smartphone, href: "/driver" },
  { label: "Billing", icon: Receipt, href: "/billing" },
  { label: "API Console", icon: Code2, href: "/api-console" },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-ops-sidebar border-r border-border h-screen flex flex-col shadow-lg">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">RIDE</h1>
        <p className="text-xs text-white/60 mt-1">Transport Management</p>
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
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/50 text-center">
          <p className="font-medium text-white/80">v0.1.0</p>
          <p>Prototype</p>
        </div>
      </div>
    </aside>
  );
};

Sidebar.displayName = "Sidebar";
