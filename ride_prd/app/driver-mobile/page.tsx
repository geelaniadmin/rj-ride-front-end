"use client";

import React from "react";
import { useLanguageStore, t } from "@ride/shared";
import { MobileFrame } from "@/components/ui/MobileFrame";
import { DriverApp } from "@/components/driver/DriverApp";

export default function DriverMobilePage() {
  const language = useLanguageStore((s) => s.language);

  return (
    <div className="min-h-screen bg-ops-bg bg-ops-grid flex flex-col items-center justify-center">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("driverMobilePortal", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("simulatedMobileApp", language)}</p>
      </div>
      <MobileFrame title="RIDE Driver">
        <DriverApp compact={true} />
      </MobileFrame>
    </div>
  );
}
