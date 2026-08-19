"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "./AuthContext";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { mutationQueue } from "@/lib/queue/MutationQueueManager";
import { syncEngine } from "@/lib/sync/SyncEngine";
import {
  getLocalSettings,
  saveLocalSettings,
  LocalUserSettings,
} from "@/lib/settings/localSettingsStore";

export type Currency = Doc<"userSettings">["currency"];
export type Calendar = Doc<"userSettings">["calendar"];
export type Language = Doc<"userSettings">["language"];

interface SettingsContextType {
  settings: Doc<"userSettings"> | null | undefined;
  updateSettings: (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => Promise<void>;
  isLoading: boolean;
  isUsingOfflineSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/** Present the local record in the Doc shape the rest of the app consumes. */
function toDoc(local: LocalUserSettings): Doc<"userSettings"> {
  return {
    _id: "local" as any,
    _creationTime: local.updatedAt,
    updatedAt: local.updatedAt,
    userId: "" as any,
    currency: local.currency,
    calendar: local.calendar,
    language: local.language,
  };
}

/**
 * Settings follow the same offline-first flow as every other collection:
 * reads come from IndexedDB, writes go local-first and then through the
 * mutation queue (which the sync engine drains immediately when online, with
 * Phase-3 idempotency), and the live Convex query acts as hydration — its
 * results are persisted locally unless an unsent local change is queued.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [localSettings, setLocalSettings] = useState<LocalUserSettings | null>(null);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [hasPendingSettings, setHasPendingSettings] = useState(false);

  // Track whether a settings change is still waiting in the sync queue.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const queued = await mutationQueue.getAll();
        if (cancelled) return;
        setHasPendingSettings(
          queued.some((m) => m.action === "userSettings:update"),
        );
      } catch {
        // Non-fatal: fall back to treating the server copy as authoritative.
      }
    };

    const unsubscribe = mutationQueue.subscribe(() => {
      void check();
    });
    void check();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Live server copy — hydration source while online.
  let onlineSettings;
  try {
    onlineSettings = useQuery(api.userSettings.get, token ? { token } : "skip");
  } catch (error) {
    console.error("Settings query error:", error);
    onlineSettings = null;
  }

  // Read the local record first — this is what an offline reload renders from.
  useEffect(() => {
    let cancelled = false;
    getLocalSettings()
      .then((stored) => {
        if (cancelled) return;
        if (stored) setLocalSettings(stored);
      })
      .catch((error) => console.error("Failed to load local settings:", error))
      .finally(() => {
        if (!cancelled) setLocalLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate the local record from the server copy — but never over a change
  // that has not been delivered yet, or reconnect would visibly revert it.
  useEffect(() => {
    if (!onlineSettings || hasPendingSettings) return;
    let cancelled = false;
    (async () => {
      // Re-check the queue directly: `hasPendingSettings` is populated
      // asynchronously, so right after mount it can still read false while
      // an undelivered change sits in the queue.
      const queued = await mutationQueue.getAll();
      if (cancelled || queued.some((m) => m.action === "userSettings:update")) {
        return;
      }
      const saved = await saveLocalSettings({
        currency: onlineSettings.currency,
        calendar: onlineSettings.calendar,
        language: onlineSettings.language ?? "en",
      });
      if (!cancelled) setLocalSettings(saved);
    })().catch((error) => console.error("Failed to persist settings:", error));
    return () => {
      cancelled = true;
    };
  }, [onlineSettings, hasPendingSettings]);

  const updateSettings = async (args: { currency?: Currency; calendar?: Calendar; language?: Language }) => {
    if (!token) {
      console.error("Authentication token not found. Cannot update settings.");
      return;
    }

    // Local first, then the shared FIFO queue — the engine drains it right
    // away when online, retries with the same idempotency key otherwise.
    const saved = await saveLocalSettings({
      ...(args.currency != null && { currency: args.currency }),
      ...(args.calendar != null && { calendar: args.calendar }),
      ...(args.language != null && { language: args.language }),
    });
    setLocalSettings(saved);

    await mutationQueue.enqueue("userSettings:update", { token, ...args });
    setHasPendingSettings(true);

    // Deliver right away when the engine is online; otherwise the queue
    // holds it until reconnect.
    void syncEngine.drainNow().catch(() => {});
  };

  // The local record is the truth the UI renders; the server copy fills in
  // only before the first local write has ever happened.
  const effectiveSettings = (
    localSettings ? toDoc(localSettings) : onlineSettings ?? null
  ) as Doc<"userSettings"> | null | undefined;

  return (
    <SettingsContext.Provider
      value={{
        settings: effectiveSettings,
        updateSettings,
        // Resolves as soon as the local read finishes, online or not — an
        // offline first run renders defaults instead of loading forever.
        isLoading: !localLoaded && onlineSettings === undefined,
        isUsingOfflineSettings: !onlineSettings && localSettings !== null,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
