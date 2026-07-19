import React from "react";
import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Toaster } from "@/components/ui/Toaster";
import { SeedInitializer } from "@/components/layout/SeedInitializer";
import { CrossTabSync } from "@/components/layout/CrossTabSync";
import { ApiProviders } from "@ride/shared/api";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIDE — Rezolv Integrated Dispatch Engine",
  description: "Multi-tenant B2B Transport Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApiProviders>
          <CrossTabSync />
          <SeedInitializer />
          <div className="flex h-screen bg-ops-bg">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <TopBar />
              <main className="flex-1 overflow-y-auto bg-ops-bg bg-ops-grid">{children}</main>
            </div>
          </div>
          <Toaster />
        </ApiProviders>
      </body>
    </html>
  );
}
