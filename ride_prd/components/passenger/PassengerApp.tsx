"use client";

import React from "react";
import { usePassengerStore } from "@/stores/passengerStore";
import { PassengerLogin } from "@/components/passenger/PassengerLogin";
import { PassengerDashboard } from "@/components/passenger/PassengerDashboard";

export const PassengerApp: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const isLoggedIn = usePassengerStore((s) => s.isLoggedIn);
  const pax = usePassengerStore((s) => s.pax);

  if (!isLoggedIn || !pax) {
    return (
      <div className="h-full flex flex-col bg-white">
        <PassengerLogin />
      </div>
    );
  }

  return <PassengerDashboard compact={compact} />;
};

PassengerApp.displayName = "PassengerApp";
