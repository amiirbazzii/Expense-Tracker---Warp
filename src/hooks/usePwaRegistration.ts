"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function usePwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

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
          updateViaCache: "all",
        });

        if (!isMounted) return;

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

        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        };

        const handleFocus = () => {
          registration.update().catch(() => {});
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

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

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
}
