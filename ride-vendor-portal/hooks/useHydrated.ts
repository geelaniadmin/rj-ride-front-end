"use client";

import { useState, useEffect } from "react";

/**
 * Returns true after the component has mounted (client-side hydration completed).
 * Prevents flash of empty Zustand data on first render.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
