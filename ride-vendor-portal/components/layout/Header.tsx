"use client";

import React, { useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { useSessionStore, useAlertStore, useVendorInfoStore, useLanguageStore } from "@ride/shared";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface HeaderProps {
  title: string;
  onToggleMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleMobile }) => {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const setVendorSession = useSessionStore((s) => s.setVendorSession);
  const vendorId = vendorSession?.vendorId || "";
  const unreadCount = useAlertStore((s) => s.getUnreadCount(vendorId));
  const vendorInfo = useVendorInfoStore((s) => s.vendorInfo);

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (!vendorSession) return null;

  const handleSwitchVendor = (v: typeof vendorInfo[0]) => {
    setVendorSession({
      vendorId: v.vendorId,
      vendorName: v.name,
      token: v.token,
      loginAt: new Date().toISOString(),
    });
    setShowSwitcher(false);
  };

  const initials = vendorSession.vendorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-card-bg border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Hamburger menu (mobile only) */}
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 hover:bg-ops-bg rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <LanguageToggle />

        {/* Bell */}
        <button
          onClick={() => setShowNotifications(true)}
          className="relative p-2 hover:bg-ops-bg rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Vendor Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-2 px-2 lg:px-3 py-1.5 hover:bg-ops-bg rounded-lg transition-colors"
          >
            <div className="w-7 h-7 bg-brand-blue rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="text-sm font-medium text-text-primary hidden sm:inline">
              {vendorSession.vendorName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
          </button>

          {showSwitcher && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSwitcher(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 lg:w-56 bg-card-bg border border-border rounded-lg shadow-lg z-20 py-1">
                {vendorInfo
                  .filter((v) => v.vendorId !== vendorSession.vendorId)
                  .map((v) => (
                    <button
                      key={v.vendorId}
                      onClick={() => handleSwitchVendor(v)}
                      className="w-full px-4 py-2.5 text-sm text-text-primary hover:bg-ops-bg text-left flex items-center justify-between"
                    >
                      <span>{v.name}</span>
                      <span className="text-xs text-text-muted">{v.vendorId}</span>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      <NotificationDrawer
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        vendorId={vendorId}
      />
    </header>
  );
};
