/**
 * Local-first storage for user settings.
 *
 * Settings previously lived inside the offline-token record, a second,
 * divergent cache that silently no-oped when no token record existed —
 * currency/calendar/language reverted to defaults offline. They now live in
 * the same IndexedDB data store as every other collection, under a reserved
 * key (a singleton, so it needs no entity plumbing), and are wiped by the
 * same `clearAllStores()` on logout.
 */

import { dataStore, idbReady } from "../storage/idb";
import { createAsyncLock } from "../storage/asyncLock";

export interface LocalUserSettings {
  currency: "USD" | "EUR" | "GBP" | "IRR";
  calendar: "gregorian" | "jalali";
  language: "en" | "fa";
  updatedAt: number;
}

const STORE_KEY = "user_settings";
const runExclusive = createAsyncLock();

export async function getLocalSettings(): Promise<LocalUserSettings | null> {
  await idbReady;
  const stored: LocalUserSettings | null = await dataStore.getItem(STORE_KEY);
  return stored && typeof stored === "object" ? stored : null;
}

/** Merge a partial change into the stored settings and return the result. */
export async function saveLocalSettings(
  partial: Partial<Omit<LocalUserSettings, "updatedAt">>,
): Promise<LocalUserSettings> {
  return runExclusive(async () => {
    const current = (await getLocalSettings()) ?? {
      currency: "USD" as const,
      calendar: "gregorian" as const,
      language: "en" as const,
      updatedAt: 0,
    };
    const next: LocalUserSettings = {
      ...current,
      ...partial,
      updatedAt: Date.now(),
    };
    await dataStore.setItem(STORE_KEY, next);
    return next;
  });
}
