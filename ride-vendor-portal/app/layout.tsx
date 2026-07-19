"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { useSessionStore, useAlertStore } from "@ride/shared";
import { ApiProviders } from "@ride/shared/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/trips": "Trips",
  "/fleet": "Fleet",
  "/earnings": "Earnings",
  "/alerts": "Alerts",
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/trips": "Trips",
  "/fleet": "Fleet",
  "/earnings": "Earnings",
  "/alerts": "Alerts",
};

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { addToast } = useToast();

  // Cross-tab sync: auto-detect changes from admin portal in real time
  useCrossTabSync();

  // Seed notifications on first load
  useEffect(() => {
    const addNotification = useAlertStore.getState().addNotification;
    const notifications = useAlertStore.getState().notifications;
    if (notifications.filter((n) => n.vendorId === "V1").length > 0) return;

    [
      {
        vendorId: "V1", type: "TRIP_ASSIGNED" as const, title: "New trip assigned",
        message: "T-V1-001: KIA Bengaluru → ITC Gardenia for IndiGo Airlines",
        tripId: "T-V1-001", read: false,
      },
      {
        vendorId: "V1", type: "DOC_EXPIRY" as const, title: "Insurance expiring",
        message: "KA-05-CH-1124 Insurance expiring in 7 days", read: false,
      },
      {
        vendorId: "V1", type: "TRIP_COMPLETED" as const, title: "Trip completed",
        message: "T-V1-003 completed — ₹3,400 earned (net)",
        tripId: "T-V1-003", read: true,
      },
      {
        vendorId: "V1", type: "DRIVER_OFFLINE" as const, title: "Driver went offline",
        message: "Rajesh Kumar (D1) went offline at 2:30 PM", read: true,
      },
      {
        vendorId: "V1", type: "FAILOVER" as const, title: "Trip reassigned (failover)",
        message: "T-V1-004 reassigned to you — Urban Drivers Co declined",
        tripId: "T-V1-004", read: true,
      },
    ].forEach((n) => addNotification(n));
  }, []);

  const handleShortcutNavigate = useCallback(
    (path: string) => {
      // Show keyboard shortcut hint only once per session
      const hintDismissed = sessionStorage.getItem("ride_kb_hint_dismissed");
      if (!hintDismissed) {
        sessionStorage.setItem("ride_kb_hint_dismissed", "true");
        addToast("Keyboard shortcuts active: 1-5 to navigate, g+d/g+t etc. for quick jump", "info");
      }
      setMobileSidebarOpen(false);
    },
    [addToast]
  );

  useKeyboardShortcuts({ onNavigate: handleShortcutNavigate });

  const isLogin = pathname === "/login";
  const title = PAGE_TITLES[pathname] || "Vendor Portal";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 lg:ml-60 flex flex-col min-w-0">
        <Header
          title={title}
          onToggleMobile={() => setMobileSidebarOpen((p) => !p)}
        />
        <OfflineBanner />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && pathname !== "/login" && !vendorSession) {
      router.push("/login");
    }
  }, [vendorSession, pathname, router, hydrated]);

  if (!hydrated && pathname !== "/login") {
    return (
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body className="min-h-screen bg-page-bg flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-text-muted">Loading...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-page-bg">
        <ApiProviders>
          <ErrorBoundary>
            <ToastProvider>
              <LayoutInner>{children}</LayoutInner>
            </ToastProvider>
          </ErrorBoundary>
        </ApiProviders>
      </body>
    </html>
  );
}
