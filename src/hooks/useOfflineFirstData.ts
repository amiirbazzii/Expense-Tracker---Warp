import { useLocalData } from './useLocalData';

/**
 * Offline-first data hook — now a thin wrapper around the reactive
 * `useLocalData()` store. All reads come from IndexedDB; the legacy
 * Convex `useQuery` fallbacks have been removed.
 *
 * The return shape is preserved for backward compatibility with the many
 * components that consume this hook.
 */
export function useOfflineFirstData() {
  const {
    expenses,
    income,
    categories,
    forValues,
    cards,
    isLoading,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate,
  } = useLocalData();

  return {
    expenses,
    income,
    categories,
    forValues,
    cards,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate,
    isLoading,
  };
}
