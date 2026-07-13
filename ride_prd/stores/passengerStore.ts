"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "@ride/shared";

interface Passenger {
  id: string;
  name: string;
  phone: string;
}

interface PassengerState {
  pax: Passenger | null;
  isLoggedIn: boolean;
  login: (name: string, phone: string) => void;
  logout: () => void;
}

export const usePassengerStore = create<PassengerState>()(
  persist(
    (set) => ({
      pax: null,
      isLoggedIn: false,

      login: (name, phone) => {
        // Generate a stable ID from name + phone so re-login yields same ID
        const raw = `${name.trim().toLowerCase()}_${phone.trim()}`;
        const id = `PAX-${Array.from(raw).reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0).toString(36).toUpperCase()}`;
        set({
          pax: { id, name: name.trim(), phone: phone.trim() },
          isLoggedIn: true,
        });
      },

      logout: () => {
        set({ pax: null, isLoggedIn: false });
      },
    }),
    { name: "ride-passenger-session", storage: createJSONStorage(() => encryptedStorage()) }
  )
);
