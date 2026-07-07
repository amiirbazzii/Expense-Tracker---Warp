"use client";

import { useEffect, useState, useRef } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { syncEngine } from "@/lib/sync/SyncEngine";

export type SyncStatus = "offline" | "synced" | "syncing";

/**
 * Reactive hook that exposes the current sync status for the UI status dot.
 *
 * - `offline` → browser reports no connectivity
 * - `synced`  → online, queue is empty, engine is idle
 * - `syncing` → online but either the drain loop is active or mutations
 *                are queued and waiting for the next drain cycle
 *
 * Polls the IndexedDB-backed queue every 1.5 s (the drain interval is 30 s,
 * so 1.5 s gives fast-enough reactivity without being wasteful).
 */
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>(
    isOnline ? "synced" : "offline",
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOnline) {
      setStatus("offline");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Online — start polling queue state.
    const poll = async () => {
      const [pendingCount, isDraining] = await Promise.all([
        syncEngine.getPendingCount(),
        // isDraining is sync, but we keep the shape consistent
        Promise.resolve(syncEngine.getIsDraining()),
      ]);

      if (isDraining || pendingCount > 0) {
        setStatus("syncing");
      } else {
        setStatus("synced");
      }
    };

    poll(); // Immediate check
    intervalRef.current = setInterval(poll, 1_500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline]);

  return status;
}
