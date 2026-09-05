"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  LocalStorageManager,
  localStorageManager,
} from '@/lib/storage/LocalStorageManager';
import { mutationQueue } from '@/lib/queue/MutationQueueManager';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { localDataStore } from '@/lib/store';
import { SyncStatus, PendingMutation } from '@/lib/types/local-storage';
import { connectivity } from '@/lib/connectivity';

interface OfflineFirstContextType {
  // Initialization state
  isInitialized: boolean;
  isOnline: boolean;

  // Storage access for callers that need the raw local store
  localStorageManager: LocalStorageManager | null;

  // Sync management
  syncStatus: SyncStatus;
  pendingOperationsCount: number;
  lastSyncTime: Date | null;

  /** Mutations that exhausted their retries and need user attention. */
  failedMutations: PendingMutation[];

  // Operations
  forcSync: () => Promise<void>;
  retryFailedMutations: () => Promise<void>;
  /** Drop rejected mutations and their never-saved local rows. */
  discardFailedMutations: () => Promise<void>;
  clearLocalData: () => Promise<void>;
}

const OfflineFirstContext = createContext<OfflineFirstContextType | null>(null);

interface OfflineFirstProviderProps {
  children: ReactNode;
  userId?: string;
}

/**
 * Exposes the real state of the offline subsystem to the UI.
 *
 * Everything here is derived from the two things that actually own that state
 * — the mutation queue and the sync engine — and updates from their change
 * events rather than by polling. The previous version reported a hard-coded
 * "synced" because the managers it read from were never constructed.
 */
export function OfflineFirstProvider({ children, userId }: OfflineFirstProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(() => connectivity.isOnline);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [failedMutations, setFailedMutations] = useState<PendingMutation[]>([]);

  // Initialize local storage for the signed-in user.
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      // No user yet — do not block the UI; storage initializes as soon as
      // authentication resolves.
      setIsInitialized(true);
      return;
    }

    localStorageManager
      .initialize(userId)
      .catch((error) => {
        console.error('OfflineFirstProvider: Initialization failed', error);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Track verified connectivity.
  useEffect(() => {
    setIsOnline(connectivity.isOnline);
    return connectivity.subscribe(setIsOnline);
  }, []);

  // Mirror the queue and the engine. Both emit on every change, so there is
  // nothing to poll.
  useEffect(() => {
    let cancelled = false;
    let previousPending = 0;

    const readQueue = async () => {
      try {
        const [pending, dead] = await Promise.all([
          mutationQueue.size(),
          mutationQueue.getDeadLetters(),
        ]);
        if (cancelled) return;

        // Going from "work outstanding" to "queue empty" is a completed sync.
        if (previousPending > 0 && pending === 0) setLastSyncTime(new Date());
        previousPending = pending;

        setPendingOperationsCount(pending);
        setFailedMutations(dead);
      } catch (error) {
        console.error('OfflineFirstProvider: Failed to read queue state', error);
      }
    };

    const unsubscribeQueue = mutationQueue.subscribe(() => {
      void readQueue();
    });
    const unsubscribeEngine = syncEngine.subscribe(() => {
      void readQueue();
    });

    void readQueue();

    return () => {
      cancelled = true;
      unsubscribeQueue();
      unsubscribeEngine();
    };
  }, []);

  // Derive the coarse status the UI shows.
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus(pendingOperationsCount > 0 ? 'pending' : 'synced');
      return;
    }
    if (failedMutations.length > 0) {
      setSyncStatus('failed');
      return;
    }
    setSyncStatus(pendingOperationsCount > 0 ? 'syncing' : 'synced');
  }, [isOnline, pendingOperationsCount, failedMutations.length]);

  const forcSync = useCallback(async () => {
    await syncEngine.drainNow();
  }, []);

  const retryFailedMutations = useCallback(async () => {
    await mutationQueue.retryDeadLetters();
    await syncEngine.drainNow();
  }, []);

  const discardFailedMutations = useCallback(async () => {
    await syncEngine.discardDeadLetters();
  }, []);

  const clearLocalData = useCallback(async () => {
    await localStorageManager.clearAllData();
    localDataStore.reset();
    setPendingOperationsCount(0);
    setFailedMutations([]);
    setLastSyncTime(null);
  }, []);

  const contextValue: OfflineFirstContextType = {
    isInitialized,
    isOnline,
    localStorageManager,
    syncStatus,
    pendingOperationsCount,
    lastSyncTime,
    failedMutations,
    forcSync,
    retryFailedMutations,
    discardFailedMutations,
    clearLocalData,
  };

  return (
    <OfflineFirstContext.Provider value={contextValue}>
      {children}
    </OfflineFirstContext.Provider>
  );
}

// Hook to use the offline-first context
export function useOfflineFirst(): OfflineFirstContextType {
  const context = useContext(OfflineFirstContext);

  if (!context) {
    throw new Error('useOfflineFirst must be used within an OfflineFirstProvider');
  }

  return context;
}

// Utility hook for checking if the app can function offline
export function useOfflineCapability() {
  const context = useContext(OfflineFirstContext);

  if (!context) {
    // Fallback for when provider is not available
    console.warn('useOfflineCapability: Context not available, returning defaults');
    return {
      canFunctionOffline: false,
      shouldShowOfflineMessage: false,
      isFullyFunctional: true, // Assume functional to prevent blocking
      isOnline: connectivity.isOnline,
      isInitialized: true, // Prevent blocking when context is unavailable
    };
  }

  const { isInitialized, isOnline, localStorageManager: storage } = context;

  const canFunctionOffline = isInitialized && storage !== null;
  const shouldShowOfflineMessage = !isOnline && !canFunctionOffline;
  const isFullyFunctional = isOnline || canFunctionOffline;

  return {
    canFunctionOffline,
    shouldShowOfflineMessage,
    isFullyFunctional,
    isOnline,
    isInitialized,
  };
}
