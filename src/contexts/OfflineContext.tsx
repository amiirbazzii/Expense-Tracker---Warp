"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import localforage from "localforage";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthContext";
import { 
  ConflictDetectionResult, 
  ConflictType, 
  SyncStatus,
  LocalDataExport 
} from "../lib/types/local-storage";
import { LocalStorageManager } from "../lib/storage/LocalStorageManager";
import { CloudSyncManager } from "../lib/sync/CloudSyncManager";
import { ConflictDetector } from "../lib/sync/ConflictDetector";
import { LocalFirstConvexClient } from "../lib/client/LocalFirstConvexClient";

export type ExpenseStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface PendingExpense {
  id: string;
  amount: number;
  title: string;
  category: string[];
  for: string[];
  date: number;
  status: ExpenseStatus;
}

interface ConflictState {
  hasConflicts: boolean;
  conflictResult?: ConflictDetectionResult;
  isResolving: boolean;
  lastDetectionTime?: Date;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingExpenses: PendingExpense[];
  addPendingExpense: (expense: Omit<PendingExpense, 'id' | 'status'>) => Promise<void>;
  syncPendingExpenses: () => Promise<void>;
  retryFailedExpense: (expenseId: string) => Promise<void>;
  
  // Enhanced local-first capabilities
  localFirstClient?: LocalFirstConvexClient;
  conflictState: ConflictState;
  syncStatus: SyncStatus;
  lastSyncTime?: Date;
  
  // Conflict resolution methods
  checkForConflicts: () => Promise<void>;
  resolveConflict: (action: 'upload_local' | 'download_cloud' | 'dismiss') => Promise<void>;
  dismissConflict: () => void;
  
  // Advanced sync methods
  forceSyncToCloud: () => Promise<void>;
  downloadCloudData: () => Promise<void>;
  getSyncStatistics: () => Promise<{ pendingOperations: number; lastSync: Date | null; }>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [conflictState, setConflictState] = useState<ConflictState>({
    hasConflicts: false,
    isResolving: false
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('pending');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [localFirstClient, setLocalFirstClient] = useState<LocalFirstConvexClient | undefined>();
  
  const { token } = useAuth();

  const createExpenseMutation = useMutation(api.expenses.createExpense);
  
  // Enhanced managers for local-first architecture
  const [localStorageManager, setLocalStorageManager] = useState<LocalStorageManager | null>(null);
  const [cloudSyncManager, setCloudSyncManager] = useState<CloudSyncManager | null>(null);
  const [conflictDetector, setConflictDetector] = useState<ConflictDetector | null>(null);

  useEffect(() => {
    const initializeLocalFirst = async () => {
      try {
        // Configure original localforage for backward compatibility
        localforage.config({
          name: 'ExpenseTracker',
          storeName: 'pending_expenses',
          description: 'Queue for offline expense submissions',
        });

        // Initialize enhanced local-first managers
        if (token) {
          const storageManager = new LocalStorageManager();
          await storageManager.initialize(token);
          setLocalStorageManager(storageManager);
          
          // Initialize cloud sync manager (requires convex client)
          // const cloudManager = new CloudSyncManager(convexClient);
          // setCloudSyncManager(cloudManager);
          
          const detector = new ConflictDetector();
          setConflictDetector(detector);
          
          // Initialize local-first client
          // const client = new LocalFirstConvexClient(convexClient);
          // await client.initialize(token);
          // setLocalFirstClient(client);
          
          // Set up event listeners for sync status changes
          // client.setEventListeners({
          //   onSyncStatusChange: (status) => {
          //     setSyncStatus(status === 'idle' ? 'synced' : status === 'syncing' ? 'syncing' : 'failed');
          //   },
          //   onConflictDetected: (result) => {
          //     setConflictState({
          //       hasConflicts: true,
          //       conflictResult: result,
          //       isResolving: false,
          //       lastDetectionTime: new Date()
          //     });
          //   }
          // });
        }

        // Load pending expenses from IndexedDB (backward compatibility)
        const loadPendingExpenses = async () => {
          try {
            const saved = await localforage.getItem<PendingExpense[]>('pending-expenses');
            if (saved) {
              setPendingExpenses(saved);
            }
          } catch (error) {
            console.error("Failed to load pending expenses from IndexedDB:", error);
          }
        };

        await loadPendingExpenses();

      } catch (error) {
        console.error('Failed to initialize local-first architecture:', error);
      }
    };

    initializeLocalFirst();

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger conflict detection when coming back online
      setTimeout(() => {
        checkForConflicts();
      }, 1000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('pending');
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  // Enhanced conflict detection and resolution methods
  const checkForConflicts = useCallback(async () => {
    if (!isOnline || !localStorageManager || !conflictDetector || !token) {
      return;
    }

    try {
      // Export current local data
      const localData = await localStorageManager.exportData();
      
      // Get cloud data (this would require cloudSyncManager)
      // const cloudData = await cloudSyncManager.syncFromCloud(token);
      
      // Detect conflicts
      // const conflictResult = await conflictDetector.detectConflicts(localData, cloudData);
      
      // if (conflictResult.hasConflicts) {
      //   setConflictState({
      //     hasConflicts: true,
      //     conflictResult,
      //     isResolving: false,
      //     lastDetectionTime: new Date()
      //   });
      // } else {
      //   setConflictState({
      //     hasConflicts: false,
      //     isResolving: false
      //   });
      // }
      
    } catch (error) {
      console.error('Conflict detection failed:', error);
    }
  }, [isOnline, localStorageManager, conflictDetector, token]);

  const resolveConflict = useCallback(async (action: 'upload_local' | 'download_cloud' | 'dismiss') => {
    if (!conflictState.hasConflicts || !localFirstClient || !token) {
      return;
    }

    setConflictState(prev => ({ ...prev, isResolving: true }));

    try {
      switch (action) {
        case 'upload_local':
          await localFirstClient.uploadLocalData(token);
          break;
        case 'download_cloud':
          await localFirstClient.downloadCloudData(token);
          break;
        case 'dismiss':
          // Just dismiss the conflict without action
          break;
      }

      setConflictState({
        hasConflicts: false,
        isResolving: false
      });
      
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      setConflictState(prev => ({ ...prev, isResolving: false }));
    }
  }, [conflictState.hasConflicts, localFirstClient, token]);

  const dismissConflict = useCallback(() => {
    setConflictState({
      hasConflicts: false,
      isResolving: false
    });
  }, []);

  const forceSyncToCloud = useCallback(async () => {
    if (!localFirstClient || !token) {
      throw new Error('Local-first client not initialized');
    }

    setSyncStatus('syncing');
    
    try {
      await localFirstClient.forceSyncToCloud(token);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, [localFirstClient, token]);

  const downloadCloudData = useCallback(async () => {
    if (!localFirstClient || !token) {
      throw new Error('Local-first client not initialized');
    }

    setSyncStatus('syncing');
    
    try {
      await localFirstClient.downloadCloudData(token);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, [localFirstClient, token]);

  const getSyncStatistics = useCallback(async () => {
    if (!localFirstClient) {
      return { pendingOperations: 0, lastSync: null };
    }

    try {
      const stats = await localFirstClient.getSyncStatus();
      return {
        pendingOperations: stats.pendingOperations,
        lastSync: stats.lastSync
      };
    } catch (error) {
      console.error('Failed to get sync statistics:', error);
      return { pendingOperations: 0, lastSync: null };
    }
  }, [localFirstClient]);

  // Auto-sync and conflict detection on app focus
  useEffect(() => {
    const handleFocus = () => {
      if (isOnline) {
        setTimeout(() => {
          checkForConflicts();
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOnline, checkForConflicts]);

  // Note: Auto-sync is handled manually to avoid circular dependencies

  const addPendingExpense = async (expense: Omit<PendingExpense, 'id' | 'status'>) => {
    const newExpense: PendingExpense = {
      ...expense,
      id: Date.now().toString(),
      status: 'pending',
    };

    const updated = [...pendingExpenses, newExpense];
    setPendingExpenses(updated);
    try {
      await localforage.setItem('pending-expenses', updated);
    } catch (error) {
      console.error("Failed to save pending expense to IndexedDB:", error);
    }
  };

  const updateExpenseStatus = async (id: string, status: ExpenseStatus) => {
    const updatedExpenses = pendingExpenses.map(e => e.id === id ? { ...e, status } : e);
    setPendingExpenses(updatedExpenses);
    await localforage.setItem('pending-expenses', updatedExpenses);
  };

  const syncPendingExpenses = async () => {
    if (!token || !isOnline) return;

    const expensesToSync = pendingExpenses.filter(e => e.status === 'pending' || e.status === 'failed');
    if (expensesToSync.length === 0) return;

    for (const expense of expensesToSync) {
      await updateExpenseStatus(expense.id, 'syncing');
      try {
        await createExpenseMutation({
          token,
          amount: expense.amount,
          title: expense.title,
          category: expense.category,
          for: expense.for,
          date: expense.date,
        });
        // On success, remove it from the pending list
        const remainingExpenses = pendingExpenses.filter(e => e.id !== expense.id);
        setPendingExpenses(remainingExpenses);
        await localforage.setItem('pending-expenses', remainingExpenses);
      } catch (error) {
        console.error(`Failed to sync expense ${expense.id}:`, error);
        await updateExpenseStatus(expense.id, 'failed');
      }
    }
  };

  const retryFailedExpense = async (expenseId: string) => {
    const expense = pendingExpenses.find(e => e.id === expenseId);
    if (!expense || !token || !isOnline) return;

    await updateExpenseStatus(expense.id, 'syncing');
    try {
      await createExpenseMutation({
        token,
        amount: expense.amount,
        title: expense.title,
        category: expense.category,
        for: expense.for,
        date: expense.date,
      });
      const remainingExpenses = pendingExpenses.filter(e => e.id !== expense.id);
      setPendingExpenses(remainingExpenses);
      await localforage.setItem('pending-expenses', remainingExpenses);
    } catch (error) {
      console.error(`Failed to retry expense ${expense.id}:`, error);
      await updateExpenseStatus(expense.id, 'failed');
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingExpenses,
        addPendingExpense,
        syncPendingExpenses,
        retryFailedExpense,
        
        // Enhanced local-first capabilities
        localFirstClient,
        conflictState,
        syncStatus,
        lastSyncTime,
        
        // Conflict resolution methods
        checkForConflicts,
        resolveConflict,
        dismissConflict,
        
        // Advanced sync methods
        forceSyncToCloud,
        downloadCloudData,
        getSyncStatistics,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
