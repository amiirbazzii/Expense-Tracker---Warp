import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LocalFirstDataResult, 
  LocalExpense, 
  LocalIncome, 
  LocalCategory, 
  LocalCard,
  DataFilters, 
  EntityType, 
  SyncStatus,
  ConflictItem
} from '../lib/types/local-storage';
import { LocalStorageManager } from '../lib/storage/LocalStorageManager';
import { CloudSyncManager } from '../lib/sync/CloudSyncManager';
import { ConflictDetector } from '../lib/sync/ConflictDetector';
import { useAuth } from '../contexts/AuthContext';

/**
 * Core local-first data hook that provides data management with automatic
 * local storage, background sync, and conflict detection capabilities
 */
export function useLocalFirstData<T>(
  entityType: EntityType,
  filters?: DataFilters
): LocalFirstDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('pending');
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const { token } = useAuth();
  const storageManagerRef = useRef<LocalStorageManager | null>(null);
  const cloudSyncManagerRef = useRef<CloudSyncManager | null>(null);
  const conflictDetectorRef = useRef<ConflictDetector | null>(null);

  // Initialize managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        if (token) {
          const storageManager = new LocalStorageManager();
          await storageManager.initialize(token);
          storageManagerRef.current = storageManager;

          // Initialize other managers
          // cloudSyncManagerRef.current = new CloudSyncManager(convexClient);
          conflictDetectorRef.current = new ConflictDetector();

          // Load initial data
          await loadLocalData();
        }
      } catch (err) {
        console.error('Failed to initialize local-first data managers:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setIsLoading(false);
      }
    };

    initializeManagers();
  }, [token]);

  // Load data from local storage
  const loadLocalData = useCallback(async () => {
    if (!storageManagerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      let localData: any[] = [];
      
      switch (entityType) {
        case 'expenses':
          localData = await storageManagerRef.current.getExpenses(filters);
          break;
        case 'income':
          localData = await storageManagerRef.current.getIncome(filters);
          break;
        case 'categories':
          localData = await storageManagerRef.current.getCategories();
          break;
        case 'cards':
          localData = await storageManagerRef.current.getCards();
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      setData(localData as T[]);
      
      // Update sync status and pending count
      const pendingItems = localData.filter(item => 
        item.syncStatus === 'pending' || item.syncStatus === 'failed'
      );
      setPendingCount(pendingItems.length);
      
      const allSynced = localData.every(item => item.syncStatus === 'synced');
      setSyncStatus(allSynced ? 'synced' : 'pending');

      // Get last sync timestamp
      const syncState = await storageManagerRef.current.getSyncState();
      if (syncState?.lastSync) {
        setLastSyncedAt(new Date(syncState.lastSync));
      }

    } catch (err) {
      console.error(`Failed to load ${entityType}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, filters]);

  // Background sync with cloud
  const syncWithCloud = useCallback(async () => {
    if (!storageManagerRef.current || !cloudSyncManagerRef.current || !token) {
      return;
    }

    try {
      setSyncStatus('syncing');
      setError(null);

      // Export local data
      const localData = await storageManagerRef.current.exportData();
      
      // Sync to cloud
      const result = await cloudSyncManagerRef.current.syncToCloud(localData, token);
      
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setSyncStatus('conflict');
      } else if (result.success) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        
        // Update local data sync status
        await updateSyncStatus('synced');
      } else {
        setSyncStatus('failed');
        setError(result.errors.map(e => e.error).join(', '));
      }

    } catch (err) {
      console.error('Cloud sync failed:', err);
      setSyncStatus('failed');
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  }, [token]);

  // Update sync status of local items
  const updateSyncStatus = useCallback(async (newStatus: SyncStatus) => {
    if (!storageManagerRef.current) return;

    try {
      // Update sync state
      await storageManagerRef.current.updateSyncState({
        lastSync: Date.now()
      });

      // Reload data to reflect changes
      await loadLocalData();
    } catch (err) {
      console.error('Failed to update sync status:', err);
    }
  }, [loadLocalData]);

  // Auto-sync when online
  useEffect(() => {
    if (navigator.onLine && syncStatus === 'pending' && token) {
      const timeoutId = setTimeout(() => {
        syncWithCloud();
      }, 2000); // Delay to avoid excessive syncing

      return () => clearTimeout(timeoutId);
    }
  }, [syncStatus, token, syncWithCloud]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === 'pending') {
        syncWithCloud();
      }
    };

    const handleOffline = () => {
      setSyncStatus('pending');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus, syncWithCloud]);

  return {
    data,
    syncStatus,
    conflicts,
    isLoading,
    error,
    lastSyncedAt,
    pendingCount
  };
}

/**
 * Hook for managing expenses with local-first architecture
 */
export function useExpenses(filters?: DataFilters): LocalFirstDataResult<LocalExpense> & {
  createExpense: (expense: Omit<LocalExpense, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>) => Promise<LocalExpense>;
  updateExpense: (id: string, updates: Partial<LocalExpense>) => Promise<LocalExpense | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
} {
  const result = useLocalFirstData<LocalExpense>('expenses', filters);
  const storageManagerRef = useRef<LocalStorageManager | null>(null);
  
  // Get storage manager from the main hook
  useEffect(() => {
    const getStorageManager = async () => {
      if (result.data.length > 0 || !result.isLoading) {
        // Storage manager should be initialized by now
        storageManagerRef.current = new LocalStorageManager();
      }
    };
    getStorageManager();
  }, [result.isLoading]);

  const createExpense = useCallback(async (
    expense: Omit<LocalExpense, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalExpense> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const savedExpense = await storageManagerRef.current.saveExpense(expense);
      
      // Trigger a data refresh
      await refreshData();
      
      return savedExpense;
    } catch (error) {
      console.error('Failed to create expense:', error);
      throw error;
    }
  }, []);

  const updateExpense = useCallback(async (
    id: string, 
    updates: Partial<LocalExpense>
  ): Promise<LocalExpense | null> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const updatedExpense = await storageManagerRef.current.updateExpense(id, updates);
      
      // Trigger a data refresh
      await refreshData();
      
      return updatedExpense;
    } catch (error) {
      console.error('Failed to update expense:', error);
      throw error;
    }
  }, []);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const success = await storageManagerRef.current.deleteExpense(id);
      
      if (success) {
        // Trigger a data refresh
        await refreshData();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete expense:', error);
      throw error;
    }
  }, []);

  const refreshData = useCallback(async () => {
    // This would trigger a re-render and data reload
    // Implementation depends on how the main hook handles refreshes
  }, []);

  return {
    ...result,
    createExpense,
    updateExpense,
    deleteExpense,
    refreshData
  };
}

/**
 * Hook for managing income with local-first architecture
 */
export function useIncome(filters?: DataFilters): LocalFirstDataResult<LocalIncome> & {
  createIncome: (income: Omit<LocalIncome, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>) => Promise<LocalIncome>;
  updateIncome: (id: string, updates: Partial<LocalIncome>) => Promise<LocalIncome | null>;
  deleteIncome: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
} {
  const result = useLocalFirstData<LocalIncome>('income', filters);
  const storageManagerRef = useRef<LocalStorageManager | null>(null);

  useEffect(() => {
    const getStorageManager = async () => {
      if (result.data.length > 0 || !result.isLoading) {
        storageManagerRef.current = new LocalStorageManager();
      }
    };
    getStorageManager();
  }, [result.isLoading]);

  const createIncome = useCallback(async (
    income: Omit<LocalIncome, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalIncome> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const savedIncome = await storageManagerRef.current.saveIncome(income);
      await refreshData();
      return savedIncome;
    } catch (error) {
      console.error('Failed to create income:', error);
      throw error;
    }
  }, []);

  const updateIncome = useCallback(async (
    id: string, 
    updates: Partial<LocalIncome>
  ): Promise<LocalIncome | null> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const updatedIncome = await storageManagerRef.current.updateIncome(id, updates);
      await refreshData();
      return updatedIncome;
    } catch (error) {
      console.error('Failed to update income:', error);
      throw error;
    }
  }, []);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const success = await storageManagerRef.current.deleteIncome(id);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (error) {
      console.error('Failed to delete income:', error);
      throw error;
    }
  }, []);

  const refreshData = useCallback(async () => {
    // Implementation for refreshing data
  }, []);

  return {
    ...result,
    createIncome,
    updateIncome,
    deleteIncome,
    refreshData
  };
}

/**
 * Hook for managing categories with local-first architecture
 */
export function useCategories(type?: 'expense' | 'income'): LocalFirstDataResult<LocalCategory> & {
  createCategory: (category: Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>) => Promise<LocalCategory>;
} {
  const result = useLocalFirstData<LocalCategory>('categories');
  const storageManagerRef = useRef<LocalStorageManager | null>(null);

  // Filter by type if specified
  const filteredData = type 
    ? result.data.filter(cat => cat.type === type)
    : result.data;

  useEffect(() => {
    const getStorageManager = async () => {
      if (result.data.length > 0 || !result.isLoading) {
        storageManagerRef.current = new LocalStorageManager();
      }
    };
    getStorageManager();
  }, [result.isLoading]);

  const createCategory = useCallback(async (
    category: Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalCategory> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      return await storageManagerRef.current.saveCategory(category);
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }, []);

  return {
    ...result,
    data: filteredData,
    createCategory
  };
}

/**
 * Hook for managing cards with local-first architecture
 */
export function useCards(): LocalFirstDataResult<LocalCard> & {
  createCard: (card: Omit<LocalCard, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>) => Promise<LocalCard>;
} {
  const result = useLocalFirstData<LocalCard>('cards');
  const storageManagerRef = useRef<LocalStorageManager | null>(null);

  useEffect(() => {
    const getStorageManager = async () => {
      if (result.data.length > 0 || !result.isLoading) {
        storageManagerRef.current = new LocalStorageManager();
      }
    };
    getStorageManager();
  }, [result.isLoading]);

  const createCard = useCallback(async (
    card: Omit<LocalCard, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalCard> => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      return await storageManagerRef.current.saveCard(card);
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }, []);

  return {
    ...result,
    createCard
  };
}

/**
 * Hook for managing sync status and operations
 */
export function useSyncStatus() {
  const [globalSyncStatus, setGlobalSyncStatus] = useState<SyncStatus>('pending');
  const [lastGlobalSync, setLastGlobalSync] = useState<Date | null>(null);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);

  const storageManagerRef = useRef<LocalStorageManager | null>(null);

  useEffect(() => {
    const initializeAndCheckStatus = async () => {
      try {
        storageManagerRef.current = new LocalStorageManager();
        
        const syncState = await storageManagerRef.current.getSyncState();
        if (syncState) {
          setLastGlobalSync(syncState.lastSync ? new Date(syncState.lastSync) : null);
          setPendingOperationsCount(syncState.pendingOperations.length);
          
          const hasPendingOps = syncState.pendingOperations.some(op => 
            op.status === 'pending' || op.status === 'failed'
          );
          setGlobalSyncStatus(hasPendingOps ? 'pending' : 'synced');
        }
      } catch (error) {
        console.error('Failed to check sync status:', error);
        setGlobalSyncStatus('failed');
      }
    };

    initializeAndCheckStatus();
  }, []);

  const triggerGlobalSync = useCallback(async () => {
    if (!storageManagerRef.current) return;

    try {
      setGlobalSyncStatus('syncing');
      
      // Get pending operations
      const pendingOps = await storageManagerRef.current.getPendingOperations();
      
      // Process pending operations (this would use CloudSyncManager)
      // For now, just simulate success
      
      setGlobalSyncStatus('synced');
      setLastGlobalSync(new Date());
      setPendingOperationsCount(0);
      
    } catch (error) {
      console.error('Global sync failed:', error);
      setGlobalSyncStatus('failed');
    }
  }, []);

  return {
    globalSyncStatus,
    lastGlobalSync,
    pendingOperationsCount,
    triggerGlobalSync
  };
}