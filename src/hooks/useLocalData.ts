'use client';

import { useSyncExternalStore, useEffect, useState, useCallback } from 'react';
import { localDataStore, type LocalDataSnapshot } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';

const EMPTY_SNAPSHOT: LocalDataSnapshot = {
  expenses: [],
  income: [],
  categories: [],
  forValues: [],
  cards: [],
  loans: [],
};

/**
 * Subscribe to the reactive LocalDataStore.
 *
 * This is the UI's only read path — no Convex `useQuery` calls. The store
 * loads from IndexedDB on init and emits change events after every write.
 *
 * The hook also ensures the store is initialized exactly once with the
 * authenticated user's ID.
 */
export function useLocalData() {
  const { user } = useAuth();
  const userId = user?._id ?? 'anonymous';

  const [isLoading, setIsLoading] = useState(!localDataStore.isInitialized());

  // Initialize the store when a user becomes available.
  useEffect(() => {
    let mounted = true;
    if (!user) return;

    if (!localDataStore.isInitialized()) {
      setIsLoading(true);
      localDataStore.init(user._id).finally(() => {
        if (mounted) setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  // Subscribe to store changes via React 18's useSyncExternalStore.
  const snapshot = useSyncExternalStore(
    localDataStore.subscribe,
    localDataStore.getSnapshot,
    localDataStore.getSnapshot, // server snapshot (SSR) — empty
  );

  const refresh = useCallback(async () => {
    await localDataStore.refresh();
  }, []);

  return {
    ...snapshot,
    expenses: snapshot.expenses ?? [],
    income: snapshot.income ?? [],
    categories: snapshot.categories ?? [],
    forValues: snapshot.forValues ?? [],
    cards: snapshot.cards ?? [],
    loans: snapshot.loans ?? [],
    isLoading,
    refresh,
    // Exposed for components that previously checked this flag — always local now.
    isUsingOfflineData: false,
    hasOfflineBackup: true,
    offlineBackupDate: null as Date | null,
  };
}
