"use client";

import { useState, useEffect } from 'react';
import { useOfflineFirst } from '@/providers/OfflineFirstProvider';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function EnhancedNetworkStatusIndicator() {
  const { 
    isOnline, 
    syncStatus, 
    pendingOperationsCount, 
    lastSyncTime,
    forcSync
  } = useOfflineFirst();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isForceSync, setIsForceSync] = useState(false);

  // Auto-hide after some time when everything is synced
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Show indicator if offline or has pending operations
    const needsToShow = !isOnline || pendingOperationsCount > 0 || syncStatus === 'syncing' || syncStatus === 'failed';
    setShouldShow(needsToShow);

    // Auto-hide after successful sync
    if (isOnline && pendingOperationsCount === 0 && syncStatus === 'synced') {
      const timer = setTimeout(() => {
        setShouldShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOperationsCount, syncStatus]);

  const handleForceSync = async () => {
    if (!isOnline || isForceSync) return;
    
    setIsForceSync(true);
    try {
      await forcSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsForceSync(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-800 text-white';
    if (syncStatus === 'failed') return 'bg-red-600 text-white';
    if (syncStatus === 'syncing' || isForceSync) return 'bg-blue-600 text-white';
    if (pendingOperationsCount > 0) return 'bg-yellow-600 text-white';
    return 'bg-green-600 text-white';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus === 'failed') return <AlertCircle className="w-4 h-4" />;
    if (syncStatus === 'syncing' || isForceSync) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (pendingOperationsCount > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'failed') return 'Sync Failed';
    if (syncStatus === 'syncing' || isForceSync) return 'Syncing';
    if (pendingOperationsCount > 0) return `${pendingOperationsCount} pending`;
    return 'Synced';
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <div 
        className={`
          flex items-center px-3 py-2 rounded-full text-sm font-medium cursor-pointer
          transition-all duration-200 shadow-lg
          ${getStatusColor()}
          ${showDetails ? 'rounded-lg' : 'rounded-full'}
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64 z-50">
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Connection</span>
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Sync Status</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon()}
                <span className={`text-sm ${
                  syncStatus === 'failed' ? 'text-red-600' :
                  syncStatus === 'syncing' ? 'text-blue-600' :
                  pendingOperationsCount > 0 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Pending Operations */}
            {pendingOperationsCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Pending</span>
                <span className="text-sm text-gray-600">{pendingOperationsCount} operations</span>
              </div>
            )}

            {/* Last Sync Time */}
            {lastSyncTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Last Sync</span>
                <span className="text-sm text-gray-600">
                  {lastSyncTime.toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200">
              {isOnline && pendingOperationsCount > 0 && (
                <button
                  onClick={handleForceSync}
                  disabled={isForceSync}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isForceSync ? 'animate-spin' : ''}`} />
                  <span>{isForceSync ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}

              {!isOnline && (
                <div className="text-xs text-gray-500 text-center">
                  Your changes are saved locally and will sync when you're back online.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced offline banner for better user experience
export function OfflineModeIndicator() {
  const { isOnline, pendingOperationsCount } = useOfflineFirst();
  const [dismissed, setDismissed] = useState(false);

  // Show banner if offline
  const shouldShow = !isOnline && !dismissed;

  if (!shouldShow) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 px-4 py-3 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <WifiOff className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              You're working offline
            </p>
            <p className="text-xs text-yellow-700">
              Changes are saved locally and will sync when connection is restored.
              {pendingOperationsCount > 0 && (
                <span className="font-medium"> ({pendingOperationsCount} pending)</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}