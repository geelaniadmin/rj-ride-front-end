"use client";

import { useEffect } from "react";
import { seedTrips } from "@/lib/mock/seed";

/**
 * Seeds demo trip data into Zustand stores on first mount.
 * Renders nothing — purely a side-effect initializer.
 */
export const SeedInitializer: React.FC = () => {
  useEffect(() => {
    seedTrips();
  }, []);

  return null;
};

SeedInitializer.displayName = "SeedInitializer";
