"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ensureAppShell } from "@/lib/pwa/warmAppShell";
import { connectivity } from "@/lib/connectivity";

export function usePwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log("[PWA] Unregistered active service worker in development mode");
            }
          });
        }
      });
      return;
    }

    // Ask the browser not to evict Cache Storage / IndexedDB under storage
    // pressure. Eviction is otherwise permanent for the precache (Workbox
    // only fills it during SW install, and an unchanged sw.js never
    // reinstalls), which killed offline startup on real devices. Best-effort:
    // browsers may decline; the self-heal below is the fallback.
    navigator.storage?.persist?.().catch(() => {});

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    let isUpdating = false;
    let hasReloaded = false;
    let toastId: string | number | null = null;
    let waitingWorker: ServiceWorker | null = null;

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // Never let update checks read sw.js from the HTTP cache: a cached
          // copy that differs from the installed worker makes every check
          // "discover" an update — including flapping back to an older build —
          // which fired updatefound (and an update toast) over and over.
          updateViaCache: "none",
        });

        if (!isMounted) return;

        // Once the worker is in control, restore any core route documents
        // missing from the caches (stale installs, evicted storage) so the
        // whole app stays cold-start navigable offline.
        navigator.serviceWorker.ready
          .then(() => ensureAppShell())
          .catch(() => {});

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (isUpdating) return;

            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              waitingWorker = newWorker;

              // One sticky toast at a time — repeated update discoveries must
              // replace the previous prompt, not stack a new one on top.
              if (toastId !== null) toast.dismiss(toastId);

              toastId = toast("Update available", {
                description: "A new version is ready.",
                action: {
                  label: "Update",
                  onClick: () => {
                    isUpdating = true;
                    if (toastId !== null) toast.dismiss(toastId);
                    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
                  },
                },
                duration: Infinity,
              });
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (isUpdating && !hasReloaded) {
            hasReloaded = true;
            window.location.reload();
          }
        });

        // Check for updates when the app returns to the foreground, at most
        // once per hour. The old version checked on every focus AND every
        // visibility change — both fire together on each app switch, so the
        // check ran near-constantly.
        const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
        let lastUpdateCheck = Date.now();

        const handleVisibilityChange = () => {
          if (document.visibilityState !== "visible") return;
          if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
          lastUpdateCheck = Date.now();
          registration.update().catch(() => {});
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
        };
      } catch (error) {
        console.warn("[PWA] SW registration failed, retrying in 5s:", error);
        retryTimer = setTimeout(() => {
          if (isMounted) registerSW();
        }, 5000);
      }
    }

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    // An app launched offline skips the self-heal; run it when verified
    // connectivity arrives so gaps are filled on the first reconnect.
    const unsubscribeConnectivity = connectivity.subscribe((online) => {
      if (online && isMounted) void ensureAppShell();
    });

    return () => {
      isMounted = false;
      unsubscribeConnectivity();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
}
