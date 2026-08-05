"use client";

import { useEffect } from "react";
import { seedTrips } from "@/lib/mock/seed";
import { useCustomerStore } from "@ride/shared";

const SEED_CUSTOMERS = [
  {
    id: "C1",
    tenantId: "T1",
    name: "IndiGo Airlines",
    code: "INDIGO",
    billingCycle: "MONTHLY" as const,
    spocName: "Priya Sharma",
    phone: "+919123456789",
    email: "dispatcher@indigo.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-HUB-001",
    active: true,
  },
  {
    id: "C2",
    tenantId: "T1",
    name: "Acme Logistics Ltd",
    code: "ACME-LOG",
    billingCycle: "FORTNIGHTLY" as const,
    spocName: "Vikram Reddy",
    phone: "+919988776655",
    email: "transport@acme.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT4"],
    defaultCostCenter: "LOG-KA-001",
    active: true,
  },
  {
    id: "C3",
    tenantId: "T1",
    name: "TechCorp India Pvt Ltd",
    code: "TECHCORP",
    billingCycle: "WEEKLY" as const,
    spocName: "Anjali Gupta",
    phone: "+919555666777",
    email: "admin@techcorp.local",
    approvedVehicleTypeIds: ["VT1", "VT2"],
    defaultCostCenter: "TECH-BNG-001",
    active: true,
  },
  {
    id: "C4",
    tenantId: "T2",
    name: "SpiceJet Airlines",
    code: "SPICEJET",
    billingCycle: "MONTHLY" as const,
    spocName: "Rohan Verma",
    phone: "+919111222333",
    email: "logistics@spicejet.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-BNG-001",
    active: true,
  },
  {
    id: "C5",
    tenantId: "T2",
    name: "Bangalore Tech Hub",
    code: "BTH-2024",
    billingCycle: "MONTHLY" as const,
    spocName: "Neha Singh",
    phone: "+919444555666",
    email: "transport@techub.local",
    approvedVehicleTypeIds: ["VT1"],
    defaultCostCenter: "TECH-HUB-001",
    active: true,
  },
  {
    id: "C6",
    tenantId: "T3",
    name: "Emirates Airlines",
    code: "EMIRATES",
    billingCycle: "MONTHLY" as const,
    spocName: "Fatima Al-Dosari",
    phone: "+971501234567",
    email: "dispatch@emirates.ae",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-UAE-001",
    active: true,
  },
];

/**
 * Seeds demo customer & trip data into Zustand stores on first mount.
 * Also listens for cross-tab storage changes from ops-portal.
 * Renders nothing — purely a side-effect initializer.
 */
export const SeedInitializer: React.FC = () => {
  useEffect(() => {
    const { customers, setCustomers } = useCustomerStore.getState();
    if (customers.length === 0) {
      setCustomers(SEED_CUSTOMERS);
    }
    seedTrips();
  }, []);

  // Listen for rate card changes from ops-portal (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ride-rate-cards") {
        // Rate cards were updated in ops-portal; reload would happen here in production
        // For now, just acknowledge the event
        console.debug("Rate cards updated from ops-portal");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return null;
};

SeedInitializer.displayName = "SeedInitializer";
