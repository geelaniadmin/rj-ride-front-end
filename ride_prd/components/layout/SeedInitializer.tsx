"use client";

import { useEffect } from "react";
import { seedTrips } from "@/lib/mock/seed";

/**
 * Seeds demo trip data into Zustand stores on first mount.
 * Also listens for cross-tab storage changes from ops-portal.
 * Renders nothing — purely a side-effect initializer.
 */
export const SeedInitializer: React.FC = () => {
  useEffect(() => {
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
