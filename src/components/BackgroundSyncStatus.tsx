/**
 * BackgroundSyncStatus - Component for displaying and controlling background sync
 */

import React, { useState } from 'react';
import { useBackgroundSync } from '../hooks/useBackgroundSync';

interface BackgroundSyncStatusProps {
  className?: string;
  showControls?: boolean;
  compact?: boolean;
}

export function BackgroundSyncStatus({ 
  className = '', 
  showControls = true, 
  compact = false 
}: BackgroundSyncStatusProps) {
  const {
    isSupported,
    isBackgroundSyncSupported,
    isPushNotificationSupported,
    syncStatus,
    notificationPermission,
    isSubscribedToPush,
    lastSyncEvent,
    forceSync,
    requestNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    refreshSyncStatus
  } = useBackgroundSync();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle force sync
   */
  const handleForceSync = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await forceSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle notification permission request
   */
  const handleRequestNotificationPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        // Automatically subscribe to push notifications
        await subscribeToPushNotifications();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle push notification toggle
   */
  const handleTogglePushNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSubscribedToPush) {
        await unsubscribeFromPushNotifications();
      } else {
        if (notificationPermission !== 'granted') {
          await requestNotificationPermission();
        }
        await subscribeToPushNotifications();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle notifications');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  /**
   * Get sync status color
   */
  const getSyncStatusColor = () => {
    if (!syncStatus) return 'text-gray-500';
    
    if (syncStatus.syncInProgress) return 'text-blue-500';
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.pendingOperationsCount > 0) return 'text-yellow-500';
    
    return 'text-green-500';
  };

  /**
   * Get sync status text
   */
  const getSyncStatusText = () => {
    if (!syncStatus) return 'Unknown';
    
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.pendingOperationsCount > 0) {
      return `${syncStatus.pendingOperationsCount} pending`;
    }
    
    return 'Up to date';
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-sm text-yellow-700">
            Background sync not supported in this browser
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getSyncStatusColor().replace('text-', 'bg-')}`}></div>
        <span className={`text-sm ${getSyncStatusColor()}`}>
          {getSyncStatusText()}
        </span>
        {syncStatus?.lastSyncTimestamp && (
          <span className="text-xs text-gray-500">
            {formatTimestamp(syncStatus.lastSyncTimestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Background Sync</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getSyncStatusColor().replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${getSyncStatusColor()}`}>
            {getSyncStatusText()}
          </span>
        </div>
      </div>

      {/* Sync Status Details */}
      {syncStatus && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${getSyncStatusColor()}`}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Pending:</span>
            <span className="ml-2 font-medium text-gray-900">
              {syncStatus.pendingOperationsCount}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Last sync:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatTimestamp(syncStatus.lastSyncTimestamp)}
            </span>
          </div>
        </div>
      )}

      {/* Last Sync Event */}
      {lastSyncEvent && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {lastSyncEvent.type === 'sync_completed' && 'Sync Completed'}
              {lastSyncEvent.type === 'sync_failed' && 'Sync Failed'}
              {lastSyncEvent.type === 'conflict_detected' && 'Conflict Detected'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(lastSyncEvent.timestamp)}
            </span>
          </div>
          
          {lastSyncEvent.type === 'sync_completed' && (
            <div className="text-sm text-gray-600 mt-1">
              {lastSyncEvent.syncedCount} items synced
              {lastSyncEvent.failedCount && lastSyncEvent.failedCount > 0 && 
                `, ${lastSyncEvent.failedCount} failed`
              }
            </div>
          )}
          
          {lastSyncEvent.type === 'sync_failed' && (
            <div className="text-sm text-red-600 mt-1">
              {lastSyncEvent.error || 'Unknown error'}
            </div>
          )}
          
          {lastSyncEvent.type === 'conflict_detected' && (
            <div className="text-sm text-yellow-600 mt-1">
              Data conflicts need to be resolved
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="space-y-3">
          {/* Sync Controls */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Manual Sync</span>
            <button
              onClick={handleForceSync}
              disabled={isLoading || (syncStatus?.syncInProgress ?? false)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Background Sync Support */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Background Sync</span>
            <span className={`text-sm ${isBackgroundSyncSupported ? 'text-green-600' : 'text-red-600'}`}>
              {isBackgroundSyncSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          {/* Push Notifications */}
          {isPushNotificationSupported && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Push Notifications</span>
              <div className="flex items-center space-x-2">
                {notificationPermission === 'default' && (
                  <button
                    onClick={handleRequestNotificationPermission}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    Enable
                  </button>
                )}
                
                {notificationPermission === 'granted' && (
                  <button
                    onClick={handleTogglePushNotifications}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded disabled:opacity-50 ${
                      isSubscribedToPush
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isSubscribedToPush ? 'Disable' : 'Enable'}
                  </button>
                )}
                
                {notificationPermission === 'denied' && (
                  <span className="text-sm text-red-600">Denied</span>
                )}
              </div>
            </div>
          )}

          {/* Refresh Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Status</span>
            <button
              onClick={refreshSyncStatus}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}