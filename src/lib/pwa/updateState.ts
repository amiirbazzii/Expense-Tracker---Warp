"use client";

/**
 * One source of truth for "a new app version is installed and now controlling
 * this page, but the running JavaScript is still the old build."
 *
 * Both surfaces — the transient toast in usePwaRegistration and the persistent
 * text action in Settings — read this flag and call the SAME applyUpdate().
 * The toast is only a notification: dismissing it must NOT clear the flag, so
 * the user can still update later from Settings. The flag is only ever set
 * true (for the lifetime of this old-version session) once a real replacement
 * service worker has taken control; a reload into the new build starts a fresh
 * session where it is false again.
 */

import { useSyncExternalStore } from "react";
import { reloadPage } from "./reloadPage";

let updateAvailable = false;
let hasReloaded = false;
const listeners = new Set<(available: boolean) => void>();

/** Called once a real replacement worker controls the page. Idempotent. */
export function markUpdateAvailable(): void {
  if (updateAvailable) return;
  updateAvailable = true;
  for (const listener of listeners) listener(true);
}

export function isUpdateAvailable(): boolean {
  return updateAvailable;
}

export function subscribeUpdateAvailable(
  listener: (available: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The one update action for every surface. The new worker is already active
 * and controlling the page (skipWaiting + clientsClaim), so this only needs to
 * load its app shell — a single reload, guarded so it can happen at most once.
 * It deliberately does NOT clear caches, unregister the worker, or touch
 * IndexedDB / the mutation queue: offline data must survive the update.
 */
export function applyUpdate(): void {
  if (hasReloaded) return;
  hasReloaded = true;
  reloadPage();
}

/** React binding for the flag. */
export function useUpdateAvailable(): boolean {
  // The flag can flip true between render and effect, so subscribe through
  // useSyncExternalStore rather than an effect that seeds state. Server
  // snapshot is always false — no update exists before the client mounts.
  return useSyncExternalStore(
    subscribeUpdateAvailable,
    isUpdateAvailable,
    () => false,
  );
}

/** Test-only: reset module state between cases. */
export function __resetUpdateStateForTests(): void {
  updateAvailable = false;
  hasReloaded = false;
  listeners.clear();
}
