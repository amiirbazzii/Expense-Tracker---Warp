"use client";

import { usePwaRegistration } from "@/hooks/usePwaRegistration";

/**
 * Registers the service worker for offline-first bootstrapping.
 * Renders nothing — it's a pure side-effect component.
 */
export function PwaRegistration() {
  usePwaRegistration();
  return null;
}
