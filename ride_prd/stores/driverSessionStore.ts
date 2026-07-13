"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "@ride/shared";

interface DriverSessionState {
  selectedDriverId: string | null;
  selectDriver: (id: string) => void;
  logout: () => void;
}

export const useDriverSessionStore = create<DriverSessionState>()(
  persist(
    (set) => ({
      selectedDriverId: null,

      selectDriver: (id) => {
        set({ selectedDriverId: id });
      },

      logout: () => {
        set({ selectedDriverId: null });
      },
    }),
    { name: "ride-driver-session", storage: createJSONStorage(() => encryptedStorage()) }
  )
);
