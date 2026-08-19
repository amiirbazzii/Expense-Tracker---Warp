"use client";

import { useEffect } from "react";
import { connectivity } from "@/lib/connectivity";

/**
 * Leaves the offline fallback page automatically once connectivity returns.
 *
 * Mounted inside /offline. Uses a full document navigation (not the client
 * router) so the request goes back through the service worker's NetworkFirst
 * route with a clean slate.
 *
 * Two guards keep this from looping on lie-fi (`navigator.onLine === true`
 * with no real internet, e.g. a captive portal):
 *
 *  1. We only leave after a *probe-verified* online signal — a real request
 *     to the origin succeeded, so the /add navigation that follows will too.
 *  2. A per-session attempt counter stops auto-leaving after a few bounces
 *     back to this page; the manual "Go to the app" link always remains.
 */
const ATTEMPTS_KEY = "offline-auto-recover-attempts";
const MAX_ATTEMPTS = 3;

function readAttempts(): number {
  try {
    return Number(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export function AutoRecover() {
  useEffect(() => {
    let cancelled = false;

    const leave = () => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(ATTEMPTS_KEY, String(readAttempts() + 1));
      } catch {
        // Storage blocked — proceed; the probe gate still applies.
      }
      window.location.replace("/add");
    };

    if (readAttempts() >= MAX_ATTEMPTS) return;

    // Verified-online transitions (including the initial probe) trigger the
    // exit; a transient blip during launch resolves within the first probe.
    const unsubscribe = connectivity.subscribe((online) => {
      if (online) leave();
    });
    void connectivity.verify().then((online) => {
      if (online) leave();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return null;
}
