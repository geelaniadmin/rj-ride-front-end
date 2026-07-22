"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Truck, CircleDollarSign, Bell, LogOut, X, Inbox } from "lucide-react";
import { useAuth, useLanguageStore, t, keys, apiClient } from "@ride/shared";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface VendorOffersPage {
  results?: Array<{ id: string; status: string }>;
}

function useActiveOfferCount() {
  const { data } = useQuery<VendorOffersPage>({
    queryKey: keys.offers.list({}),
    queryFn: async () => {
      const { data: res, error } = await apiClient.GET("/v1/vendor/offers" as never, {} as never);
      if (error) return { results: [] };
      return res as unknown as VendorOffersPage;
    },
    staleTime: 30_000,
    retry: false,
  });
  return (data?.results ?? []).filter((o) => o.status === "OFFERED" || o.status === "ALERTED").length;
}

export const NAV_ITEMS = [
  { href: "/" as const, labelKey: "dashboard" as const, icon: LayoutDashboard, shortcut: "1" as const },
  { href: "/trips" as const, labelKey: "trips" as const, icon: ListOrdered, shortcut: "2" as const },
  { href: "/fleet" as const, labelKey: "fleet" as const, icon: Truck, shortcut: "3" as const },
  { href: "/earnings" as const, labelKey: "earnings" as const, icon: CircleDollarSign, shortcut: "4" as const },
  { href: "/alerts" as const, labelKey: "alerts" as const, icon: Bell, shortcut: "5" as const },
  { href: "/offers" as const, labelKey: "offers" as const, icon: Inbox, shortcut: "6" as const },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const { logout } = useAuth();
  const activeOfferCount = useActiveOfferCount();

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
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badge = item.href === "/offers" && activeOfferCount > 0 ? activeOfferCount : null;
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
              {badge !== null ? (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-brand-blue text-white text-[10px] font-bold px-1">
                  {badge}
                </span>
              ) : (
                <span className="text-[10px] text-white/30 font-mono hidden lg:inline">{item.shortcut}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <button
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
      <div className="hidden lg:block fixed left-0 top-0 z-30 h-screen">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <div className="absolute left-0 top-0 h-full shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
