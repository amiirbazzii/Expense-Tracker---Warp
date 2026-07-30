"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { mutationQueue } from "@/lib/queue/MutationQueueManager";

export type SyncStatus = "offline" | "synced" | "syncing" | "attention";

/**
 * Reactive hook that exposes the current sync status for the UI status dot.
 *
 * - `offline`   → browser reports no connectivity
 * - `synced`    → online, queue is empty, engine is idle
 * - `syncing`   → online and there is outstanding work
 * - `attention` → a mutation exhausted its retries, or the session token was
 *                 rejected; the change is safe locally but needs the user
 *
 * Driven by change events from the queue and the engine — no polling.
 */
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>(
    isOnline ? "synced" : "offline",
  );

  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      if (cancelled) return;

      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      try {
        const [pending, dead] = await Promise.all([
          mutationQueue.size(),
          mutationQueue.getDeadLetters(),
        ]);
        if (cancelled) return;

        const { isDraining, needsAuth } = syncEngine.getStatus();

        if (dead.length > 0 || needsAuth) setStatus("attention");
        else if (isDraining || pending > 0) setStatus("syncing");
        else setStatus("synced");
      } catch {
        // A failed status read must never break the UI.
      }
    };

    const unsubscribeQueue = mutationQueue.subscribe(() => {
      void update();
    });
    const unsubscribeEngine = syncEngine.subscribe(() => {
      void update();
    });

    void update();

    return () => {
      cancelled = true;
      unsubscribeQueue();
      unsubscribeEngine();
    };
  }, [isOnline]);

  return status;
}
