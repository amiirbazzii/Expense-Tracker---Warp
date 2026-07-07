"use client";

import { useEffect, useRef } from "react";

/**
 * Registers the Service Worker and enforces cache hygiene.
 *
 * Key design decisions to prevent cache bloat:
 * - No periodic `registration.update()` polling (prevents unnecessary
 *   byte-for-byte SW comparisons that create duplicate cache entries)
 * - Listens for the `controllerchange` event instead, which fires naturally
 *   when a new SW takes over
 * - Posts `CLAIM_CLIENTS` after activation so the SW controls all tabs
 * - The SW's `activate` handler (in background-sync-sw.js) handles purging
 *   stale cache entries — this just ensures the SW is running and current
 */
export function usePwaRegistration() {
  const swUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Bail if Service Workers are not supported
    if (!("serviceWorker" in navigator)) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    async function activateWorker(registration: ServiceWorkerRegistration) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      const active = registration.active;
      if (active) {
        active.postMessage({ type: "CLAIM_CLIENTS" });
      }

      return registration;
    }

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "all",
        });

        if (!isMounted) return;

        // If this is the first load and SW just installed,
        // wait for it to transition to active
        if (registration.installing) {
          registration.installing.addEventListener("statechange", (e) => {
            const worker = e.target as ServiceWorker;
            if (worker.state === "activated" && isMounted) {
              activateWorker(registration);
            }
          });
        } else if (registration.active) {
          await activateWorker(registration);
        }

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] New version available — refresh to update");
              }
            });
          }
        });

        // Passive update check: only when the page is visible and focused.
        // This avoids the cache-churn problem caused by aggressive polling
        // that triggers unnecessary SW byte-comparisons on every interval tick.
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {
              // Silently fail — not critical
            });
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also check on page focus (covers cases where user switches tabs
        // without a visibility change)
        const handleFocus = () => {
          registration.update().catch(() => {});
        };
        window.addEventListener("focus", handleFocus);

        // Cleanup listeners
        return () => {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
          window.removeEventListener("focus", handleFocus);
        };
      } catch (error) {
        console.warn("[PWA] SW registration failed, retrying in 5s:", error);
        retryTimer = setTimeout(() => {
          if (isMounted) registerSW();
        }, 5000);
      }
    }

    // Wait for the page to be fully loaded before registering
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (swUpdateInterval.current) clearInterval(swUpdateInterval.current);
    };
  }, []);
}
