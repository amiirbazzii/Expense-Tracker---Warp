"use client";

import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useOfflineFirst } from "@/providers/OfflineFirstProvider";

/**
 * SyncEngine is a non-visual component that orchestrates the FIFO queue
 * processing. It mounts once inside the OfflineFirstProvider and runs the
 * sync loop whenever the app transitions online or boots with connectivity.
 */
export function SyncEngine() {
  const { localStorageManager, isOnline } = useOfflineFirst();
  useSyncEngine(localStorageManager, isOnline);
  return null;
}
