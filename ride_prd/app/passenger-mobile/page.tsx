"use client";

import React from "react";
import { useLanguageStore, t } from "@ride/shared";
import { MobileFrame } from "@/components/ui/MobileFrame";
import { PassengerApp } from "@/components/passenger/PassengerApp";

export default function PassengerMobilePage() {
  const language = useLanguageStore((s) => s.language);

  return (
    <div className="min-h-screen bg-ops-bg bg-ops-grid flex flex-col items-center justify-center">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("passengerMobilePortal", language)}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("simulatedPassengerApp", language)}</p>
      </div>
      <MobileFrame title="RIDE Passenger">
        <PassengerApp compact={true} />
      </MobileFrame>
    </div>
  );
}
