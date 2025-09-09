"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { LocalStorageManager } from '@/lib/storage/LocalStorageManager';
import { CloudSyncManager } from '@/lib/sync/CloudSyncManager';
import { PerformanceOptimizer } from '@/lib/optimization/PerformanceOptimizer';
import { ConflictDetector } from '@/lib/sync/ConflictDetector';
import { LocalFirstConvexClient } from '@/lib/client/LocalFirstConvexClient';
import { SyncStatus, SyncResult, PendingOperation } from '@/lib/types/local-storage';

interface OfflineFirstContextType {
  // Initialization state
  isInitialized: boolean;
  isOnline: boolean;
  
  // Core managers
  localStorageManager: LocalStorageManager | null;
  cloudSyncManager: CloudSyncManager | null;
  performanceOptimizer: PerformanceOptimizer | null;
  
  // Sync management
  syncStatus: SyncStatus;
  pendingOperationsCount: number;
  lastSyncTime: Date | null;
  
  // Operations
  forcSync: () => Promise<SyncResult[]>;
  clearLocalData: () => Promise<void>;
  
  // Status getters
  getSyncQueueStatus: () => any;
  getPerformanceMetrics: () => any;
}

const OfflineFirstContext = createContext<OfflineFirstContextType | null>(null);

interface OfflineFirstProviderProps {
  children: ReactNode;
  userId?: string;
}

export function OfflineFirstProvider({ children, userId }: OfflineFirstProviderProps) {
  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // Core managers
  const [localStorageManager, setLocalStorageManager] = useState<LocalStorageManager | null>(null);
  const [cloudSyncManager, setCloudSyncManager] = useState<CloudSyncManager | null>(null);
  const [performanceOptimizer, setPerformanceOptimizer] = useState<PerformanceOptimizer | null>(null);
  const [conflictDetector, setConflictDetector] = useState<ConflictDetector | null>(null);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize the offline-first system
  const initialize = useCallback(async (currentUserId: string) => {
    try {
      console.log('OfflineFirstProvider: Initializing for user', currentUserId);
      
      // Initialize local storage manager
      const localManager = new LocalStorageManager();
      await localManager.initialize(currentUserId);
      setLocalStorageManager(localManager);
      
      // Initialize conflict detector (no parameters needed)
      const detector = new ConflictDetector();
      setConflictDetector(detector);
      
      // Note: CloudSyncManager needs ConvexClient, not LocalStorageManager
      // We'll initialize it later when we have proper ConvexClient access
      // For now, skip CloudSyncManager initialization
      // const syncManager = new CloudSyncManager(convexClient, detector);
      // setCloudSyncManager(syncManager);
      
      // Skip performance optimizer for now since it depends on sync manager
      // const optimizer = new PerformanceOptimizer(...);
      // setPerformanceOptimizer(optimizer);
      
      // Get initial sync state
      const syncState = await localManager.getSyncState();
      if (syncState) {
        setPendingOperationsCount(syncState.pendingOperations?.length || 0);
        if (syncState.lastSync) {
          setLastSyncTime(new Date(syncState.lastSync));
        }
      }
      
      // Set sync status based on pending operations
      setSyncStatus((syncState?.pendingOperations?.length || 0) > 0 ? 'pending' : 'synced');
      
      setIsInitialized(true);
      console.log('OfflineFirstProvider: Initialization complete');
      
    } catch (error) {
      console.error('OfflineFirstProvider: Initialization failed', error);
      setIsInitialized(true); // Still set to true to allow app to function
    }
  }, []);

  // Initialize when userId becomes available
  useEffect(() => {
    if (userId && !isInitialized) {
      initialize(userId);
    } else if (!userId && !isInitialized) {
      // If no userId provided, still mark as initialized but without local storage capabilities
      console.log('OfflineFirstProvider: No userId provided, initializing without local storage');
      setIsInitialized(true);
    }
  }, [userId, isInitialized, initialize]);

  // Set up online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('OfflineFirstProvider: Online detected');
      setIsOnline(true);
      
      // Skip auto-sync for now since CloudSyncManager is not initialized
      // TODO: Implement proper sync when CloudSyncManager is available
    };

    const handleOffline = () => {
      console.log('OfflineFirstProvider: Offline detected');
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cloudSyncManager, pendingOperationsCount]);

  // Set up service worker message handling
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC') {
        console.log('OfflineFirstProvider: Background sync triggered by service worker');
        // Skip processing since CloudSyncManager is not initialized
        // TODO: Implement when CloudSyncManager is properly set up
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [cloudSyncManager]);

  // Monitor sync state changes
  useEffect(() => {
    if (!localStorageManager) return;

    const monitorSyncState = async () => {
      try {
        const syncState = await localStorageManager.getSyncState();
        if (syncState) {
          setPendingOperationsCount(syncState.pendingOperations.length);
          setSyncStatus(syncState.pendingOperations.length > 0 ? 'pending' : 'synced');
          
          if (syncState.lastSync) {
            setLastSyncTime(new Date(syncState.lastSync));
          }
        }
      } catch (error) {
        console.error('OfflineFirstProvider: Failed to monitor sync state', error);
      }
    };

    // Monitor sync state every 10 seconds
    const interval = setInterval(monitorSyncState, 10000);

    return () => clearInterval(interval);
  }, [localStorageManager]);

  // Force sync all pending operations
  const forcSync = useCallback(async (): Promise<SyncResult[]> => {
    if (!cloudSyncManager) {
      throw new Error('Sync manager not initialized');
    }

    try {
      setSyncStatus('syncing');
      // Note: processQueue expects (operations, token) parameters
      // For now, return empty result since CloudSyncManager is not properly initialized
      const results: SyncResult[] = [];
      
      setSyncStatus('synced');
      setPendingOperationsCount(0);
      setLastSyncTime(new Date());
      
      return results;
    } catch (error) {
      console.error('OfflineFirstProvider: Force sync failed', error);
      setSyncStatus('failed');
      throw error;
    }
  }, [cloudSyncManager]);

  // Clear all local data
  const clearLocalData = useCallback(async (): Promise<void> => {
    if (!localStorageManager) {
      throw new Error('Storage manager not initialized');
    }

    try {
      await localStorageManager.clearAllData();
      setPendingOperationsCount(0);
      setSyncStatus('synced');
      setLastSyncTime(null);
      console.log('OfflineFirstProvider: Local data cleared');
    } catch (error) {
      console.error('OfflineFirstProvider: Failed to clear local data', error);
      throw error;
    }
  }, [localStorageManager]);

  // Get sync queue status
  const getSyncQueueStatus = useCallback(() => {
    return performanceOptimizer?.getSyncQueueStatus() || {
      total: 0,
      active: 0,
      byPriority: { high: 0, medium: 0, low: 0 }
    };
  }, [performanceOptimizer]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return performanceOptimizer?.getMetrics() || {
      syncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      cacheHitRate: 0,
      pendingOperations: 0
    };
  }, [performanceOptimizer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performanceOptimizer?.cleanup();
    };
  }, [performanceOptimizer]);

  const contextValue: OfflineFirstContextType = {
    // Initialization state
    isInitialized,
    isOnline,
    
    // Core managers
    localStorageManager,
    cloudSyncManager,
    performanceOptimizer,
    
    // Sync management
    syncStatus,
    pendingOperationsCount,
    lastSyncTime,
    
    // Operations
    forcSync,
    clearLocalData,
    
    // Status getters
    getSyncQueueStatus,
    getPerformanceMetrics
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
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isInitialized: true // Prevent blocking when context is unavailable
    };
  }
  
  const { isInitialized, isOnline, localStorageManager } = context;
  
  const canFunctionOffline = isInitialized && localStorageManager !== null;
  const shouldShowOfflineMessage = !isOnline && !canFunctionOffline;
  const isFullyFunctional = isOnline || canFunctionOffline;
  
  return {
    canFunctionOffline,
    shouldShowOfflineMessage,
    isFullyFunctional,
    isOnline,
    isInitialized
  };
}