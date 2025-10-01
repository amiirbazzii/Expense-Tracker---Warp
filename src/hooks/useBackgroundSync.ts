/**
 * useBackgroundSync - React hook for background sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { serviceWorkerManager, SyncStatus, SyncEvent } from '../lib/workers/ServiceWorkerManager';

export interface BackgroundSyncState {
  isSupported: boolean;
  isBackgroundSyncSupported: boolean;
  isPushNotificationSupported: boolean;
  syncStatus: SyncStatus | null;
  notificationPermission: NotificationPermission;
  isSubscribedToPush: boolean;
  lastSyncEvent: SyncEvent | null;
}

export interface BackgroundSyncActions {
  forceSync: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToPushNotifications: () => Promise<boolean>;
  unsubscribeFromPushNotifications: () => Promise<boolean>;
  refreshSyncStatus: () => Promise<void>;
}

/**
 * Hook for managing background sync functionality
 */
export function useBackgroundSync(): BackgroundSyncState & BackgroundSyncActions {
  const [state, setState] = useState<BackgroundSyncState>({
    isSupported: false,
    isBackgroundSyncSupported: false,
    isPushNotificationSupported: false,
    syncStatus: null,
    notificationPermission: 'default',
    isSubscribedToPush: false,
    lastSyncEvent: null
  });

  /**
   * Initialize background sync state
   */
  useEffect(() => {
    const initializeState = async () => {
      const isSupported = serviceWorkerManager.isSupported();
      const isBackgroundSyncSupported = serviceWorkerManager.isBackgroundSyncSupported();
      const isPushNotificationSupported = serviceWorkerManager.isPushNotificationSupported();
      
      let notificationPermission: NotificationPermission = 'default';
      let isSubscribedToPush = false;

      if (isPushNotificationSupported) {
        notificationPermission = Notification.permission;
        
        // Check if already subscribed to push notifications
        const registration = serviceWorkerManager.getRegistration();
        if (registration) {
          try {
            const subscription = await registration.pushManager.getSubscription();
            isSubscribedToPush = !!subscription;
          } catch (error) {
            console.error('Failed to check push subscription:', error);
          }
        }
      }

      // Get initial sync status
      const syncStatus = await serviceWorkerManager.getSyncStatus();

      setState(prev => ({
        ...prev,
        isSupported,
        isBackgroundSyncSupported,
        isPushNotificationSupported,
        notificationPermission,
        isSubscribedToPush,
        syncStatus
      }));
    };

    initializeState();
  }, []);

  /**
   * Setup sync event listener
   */
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      setState(prev => ({
        ...prev,
        lastSyncEvent: event
      }));

      // Refresh sync status after sync events
      if (event.type === 'sync_completed' || event.type === 'sync_failed') {
        refreshSyncStatus();
      }
    };

    serviceWorkerManager.addEventListener(handleSyncEvent);

    return () => {
      serviceWorkerManager.removeEventListener(handleSyncEvent);
    };
  }, []);

  /**
   * Periodically refresh sync status
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      const syncStatus = await serviceWorkerManager.getSyncStatus();
      setState(prev => ({
        ...prev,
        syncStatus
      }));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Force immediate sync
   */
  const forceSync = useCallback(async () => {
    try {
      await serviceWorkerManager.forceSync();
      
      // Refresh status after forcing sync
      setTimeout(async () => {
        const syncStatus = await serviceWorkerManager.getSyncStatus();
        setState(prev => ({
          ...prev,
          syncStatus
        }));
      }, 1000);
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    try {
      const permission = await serviceWorkerManager.requestNotificationPermission();
      
      setState(prev => ({
        ...prev,
        notificationPermission: permission
      }));

      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribeToPushNotifications = useCallback(async () => {
    try {
      const subscription = await serviceWorkerManager.subscribeToPushNotifications();
      const isSubscribed = !!subscription;

      setState(prev => ({
        ...prev,
        isSubscribedToPush: isSubscribed
      }));

      return isSubscribed;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }, []);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribeFromPushNotifications = useCallback(async () => {
    try {
      const success = await serviceWorkerManager.unsubscribeFromPushNotifications();

      if (success) {
        setState(prev => ({
          ...prev,
          isSubscribedToPush: false
        }));
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }, []);

  /**
   * Refresh sync status
   */
  const refreshSyncStatus = useCallback(async () => {
    try {
      const syncStatus = await serviceWorkerManager.getSyncStatus();
      setState(prev => ({
        ...prev,
        syncStatus
      }));
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  return {
    ...state,
    forceSync,
    requestNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    refreshSyncStatus
  };
}

/**
 * Hook for sync status only (lighter version)
 */
export function useSyncStatus(): {
  syncStatus: SyncStatus | null;
  refreshSyncStatus: () => Promise<void>;
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await serviceWorkerManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  useEffect(() => {
    refreshSyncStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshSyncStatus, 30000);
    
    return () => clearInterval(interval);
  }, [refreshSyncStatus]);

  return {
    syncStatus,
    refreshSyncStatus
  };
}