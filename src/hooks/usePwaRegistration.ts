"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ensureAppShell } from "@/lib/pwa/warmAppShell";
import { applyUpdate, markUpdateAvailable } from "@/lib/pwa/updateState";
import { connectivity } from "@/lib/connectivity";

/** Periodic sw.js check so a window that stays open (and visible, so the
 *  visibilitychange path never fires) still discovers deploys. */
const PERIODIC_UPDATE_CHECK_MS = 5 * 60 * 1000;

/** Visibility-return checks keep their old, coarser throttle: foreground
 *  switches are frequent and the periodic timer already covers the gaps. */
const VISIBILITY_UPDATE_CHECK_MS = 60 * 60 * 1000;

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
    let isBootPromoting = false;
    let toastId: string | number | null = null;
    let swCleanup: (() => void) | null = null;
    // Assigned once the registration exists; the connectivity subscription
    // below may fire before then, so it starts as a no-op.
    let requestUpdateCheck: () => void = () => {};

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

        // With skipWaiting + clientsClaim a new worker installs, activates,
        // and claims this page entirely on its own — there is never a waiting
        // worker for a button to promote. By the time controllerchange fires
        // the update is fully installed (Workbox installs atomically) and
        // already controlling the page; only the running JS is still the
        // previous build's. So controllerchange IS the "update ready" signal:
        // prompt there, and the button's whole job is one reload. Never reload
        // automatically — the user may be mid-entry, and the old build keeps
        // working because its chunks stay in the runtime caches.
        //
        // A controllerchange with no controller beforehand is the FIRST
        // install claiming the page, not an update — no prompt for that.
        let hadController = !!navigator.serviceWorker.controller;

        const handleControllerChange = () => {
          const isReplacement = hadController;
          hadController = true;

          if (isBootPromoting) {
            // Boot-promoted stalled worker (see below): nothing unsaved this
            // early, reload straight into it.
            isBootPromoting = false;
            applyUpdate();
            return;
          }

          if (!isReplacement || !isMounted) return;

          // A real replacement worker now controls the page. Record it in the
          // shared flag so Settings can offer the same update later — this
          // survives the toast being dismissed; only a reload into the new
          // build clears it.
          markUpdateAvailable();

          // One sticky toast at a time — repeated update discoveries must
          // replace the previous prompt, not stack a new one on top.
          if (toastId !== null) toast.dismiss(toastId);

          toastId = toast("Update available", {
            description: "A new version is ready.",
            action: {
              label: "Update",
              // Same action as the Settings button — dismiss this
              // notification and load the new app shell once.
              onClick: () => {
                if (toastId !== null) toast.dismiss(toastId);
                applyUpdate();
              },
            },
            duration: Infinity,
          });
        };

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleControllerChange,
        );

        // A worker already waiting at page load is an update that stalled in
        // a previous session — on real devices it stayed stuck for months,
        // leaving an ancient worker (with no offline app shell) in control
        // while every deploy just replaced the waiting one. This early in the
        // boot there is nothing unsaved, so promote it immediately; the
        // controllerchange handler above reloads into it.
        if (registration.waiting && navigator.serviceWorker.controller) {
          isBootPromoting = true;
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // All update checks funnel through here: at most one sw.js fetch in
        // flight, failures (e.g. offline) swallowed — the next trigger simply
        // tries again.
        let updateCheckInFlight = false;
        requestUpdateCheck = () => {
          if (updateCheckInFlight) return;
          updateCheckInFlight = true;
          registration
            .update()
            .catch(() => {})
            .finally(() => {
              updateCheckInFlight = false;
            });
        };

        // Check when the app returns to the foreground, at most once per
        // hour. The old version checked on every focus AND every visibility
        // change — both fire together on each app switch, so the check ran
        // near-constantly.
        let lastVisibilityCheck = Date.now();
        const handleVisibilityChange = () => {
          if (document.visibilityState !== "visible") return;
          if (Date.now() - lastVisibilityCheck < VISIBILITY_UPDATE_CHECK_MS) return;
          lastVisibilityCheck = Date.now();
          requestUpdateCheck();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const periodicTimer = setInterval(
          requestUpdateCheck,
          PERIODIC_UPDATE_CHECK_MS,
        );

        swCleanup = () => {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange,
          );
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
          clearInterval(periodicTimer);
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

    // On verified reconnect: an app launched offline skipped the self-heal,
    // so fill any app-shell gaps now — and check for updates, because a
    // release deployed while this device was offline is otherwise invisible
    // until the next launch.
    const unsubscribeConnectivity = connectivity.subscribe((online) => {
      if (!online || !isMounted) return;
      void ensureAppShell();
      requestUpdateCheck();
    });

    return () => {
      isMounted = false;
      unsubscribeConnectivity();
      window.removeEventListener("load", registerSW);
      if (swCleanup) swCleanup();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
}
