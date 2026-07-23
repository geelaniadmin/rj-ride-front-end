"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Inbox, Truck, CircleDollarSign, Bell, LogOut, X } from "lucide-react";
import { useAuth, useLanguageStore, t, csrfFetch } from "@/lib/shared";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/" as const, labelKey: "dashboard" as const, icon: LayoutDashboard, shortcut: "1" as const },
  { href: "/offers" as const, labelKey: "offers" as const, icon: Inbox, shortcut: "2" as const },
  { href: "/trips" as const, labelKey: "trips" as const, icon: ListOrdered, shortcut: "3" as const },
  { href: "/fleet" as const, labelKey: "fleet" as const, icon: Truck, shortcut: "4" as const },
  { href: "/earnings" as const, labelKey: "earnings" as const, icon: CircleDollarSign, shortcut: "5" as const },
  { href: "/alerts" as const, labelKey: "alerts" as const, icon: Bell, shortcut: "6" as const },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();

  // Offer count for the nav badge, so a new/alerted offer is visible from any page — not only
  // while the Offers screen happens to be open. Shares the ["vendor","offers"] cache key with
  // that screen and with the WS invalidation in app/layout.tsx, so it updates instantly too.
  const { data: pendingOffers = 0 } = useQuery({
    queryKey: ["vendor", "offers"],
    queryFn: async (): Promise<{ status?: string }[]> => {
      const resp = await csrfFetch("/api/v1/vendor/offers/", { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed to load offers (${resp.status})`);
      const body = (await resp.json()) as { results?: { status?: string }[] };
      return body.results ?? [];
    },
    refetchInterval: 15_000,
    select: (rows) => rows.filter((r) => r.status === "OFFERED" || r.status === "ALERTED").length,
  });
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const { logout } = useAuth();

  const handleLogout = () => {
    void logout();
    router.push("/login");
    onMobileClose?.();
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  if (pathname === "/login") return null;

  const sidebarContent = (
    <aside className="w-60 min-h-screen bg-sidebar-bg flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{t('rideTM', language)}</p>
            <p className="text-white/50 text-xs">{t('vendorPortal', language)}</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "text-white bg-white/10 border-l-2 border-brand-blue"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t(item.labelKey, language)}</span>
              {item.href === "/offers" && pendingOffers > 0 && (
                <span
                  className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center"
                  title={`${pendingOffers} offer${pendingOffers === 1 ? "" : "s"} awaiting your response`}
                >
                  {pendingOffers}
                </span>
              )}
              <span className="text-[10px] text-white/30 font-mono hidden lg:inline">{item.shortcut}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">          <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {t('logout', language)}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 z-30 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile: overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          {/* Sidebar panel */}
          <div className="absolute left-0 top-0 h-full shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
