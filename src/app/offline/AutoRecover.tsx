"use client";

import { useEffect } from "react";

/**
 * Leaves the offline fallback page automatically once connectivity returns.
 *
 * Mounted inside /offline. Uses a full document navigation (not the client
 * router) so the request goes back through the service worker's NetworkFirst
 * route with a clean slate. No retry loop while offline: if the navigation
 * fails again the fallback simply re-renders this page.
 */
export function AutoRecover() {
  useEffect(() => {
    const leave = () => {
      window.location.replace("/add");
    };

    // Already back online by the time this mounted (transient blip during
    // launch) — leave immediately.
    if (navigator.onLine) {
      leave();
      return;
    }

    window.addEventListener("online", leave);
    return () => window.removeEventListener("online", leave);
  }, []);

  return null;
}
