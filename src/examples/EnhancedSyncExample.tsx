import React, { useState, useEffect } from 'react';
import { CloudSyncManager } from '../lib/sync/CloudSyncManager';
import { ConvexClient } from 'convex/browser';

/**
 * Example component demonstrating the enhanced CloudSyncManager features:
 * - Incremental sync with delta detection
 * - Batch operations for efficiency
 * - Network-aware sync scheduling
 * - Compression for large data transfers
 */
export const EnhancedSyncExample: React.FC = () => {
  const [syncManager, setSyncManager] = useState<CloudSyncManager | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [networkSchedule, setNetworkSchedule] = useState<any>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  useEffect(() => {
    // Initialize CloudSyncManager with enhanced features
    const convexClient = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const manager = new CloudSyncManager(convexClient, {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 10000,
      backoffFactor: 1.5,
      jitter: true
    });

    setSyncManager(manager);

    // Get initial stats and network schedule
    setSyncStats(manager.getSyncStats());
    setNetworkSchedule(manager.getNetworkAwareSyncSchedule());

    // Cleanup on unmount
    return () => {
      manager.cleanup();
    };
  }, []);

  const handleIncrementalSync = async () => {
    if (!syncManager) return;

    try {
      const result = await syncManager.performIncrementalSync('demo-token', Date.now() - 3600000);
      setLastSyncResult(result);
      setSyncStats(syncManager.getSyncStats());
    } catch (error) {
      console.error('Incremental sync failed:', error);
    }
  };

  const handleBatchSync = async () => {
    if (!syncManager) return;

    // Example pending operations
    const pendingOperations = [
      {
        id: 'op1',
        type: 'create' as const,
        entityType: 'expenses' as const,
        entityId: 'expense1',
        data: { amount: 100, title: 'Coffee', category: ['food'], for: ['personal'], date: Date.now() },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const,
        maxRetries: 3
      },
      {
        id: 'op2',
        type: 'update' as const,
        entityType: 'expenses' as const,
        entityId: 'expense2',
        data: { amount: 50, title: 'Lunch', category: ['food'], for: ['personal'], date: Date.now() },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const,
        maxRetries: 3
      }
    ];

    try {
      const result = await syncManager.processQueue(pendingOperations, 'demo-token');
      setLastSyncResult(result);
      setSyncStats(syncManager.getSyncStats());
    } catch (error) {
      console.error('Batch sync failed:', error);
    }
  };

  const handleConfigUpdate = () => {
    if (!syncManager) return;

    // Update sync configuration for different network conditions
    syncManager.updateSyncConfig({
      batchSize: 25,
      maxConcurrentOperations: 2,
      enableCompression: true,
      compressionThreshold: 512
    });

    setSyncStats(syncManager.getSyncStats());
    setNetworkSchedule(syncManager.getNetworkAwareSyncSchedule());
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced CloudSyncManager Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Controls */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sync Operations</h2>
          <div className="space-y-3">
            <button
              onClick={handleIncrementalSync}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Perform Incremental Sync
            </button>
            <button
              onClick={handleBatchSync}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Process Batch Operations
            </button>
            <button
              onClick={handleConfigUpdate}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Update Sync Configuration
            </button>
          </div>
        </div>

        {/* Sync Statistics */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sync Statistics</h2>
          {syncStats && (
            <div className="space-y-2 text-sm">
              <div><strong>Active Syncs:</strong> {syncStats.activeSyncs}</div>
              <div><strong>Batch Size:</strong> {syncStats.syncConfig.batchSize}</div>
              <div><strong>Max Concurrent:</strong> {syncStats.syncConfig.maxConcurrentOperations}</div>
              <div><strong>Compression:</strong> {syncStats.syncConfig.enableCompression ? 'Enabled' : 'Disabled'}</div>
              <div><strong>Compression Threshold:</strong> {syncStats.syncConfig.compressionThreshold} bytes</div>
            </div>
          )}
        </div>

        {/* Network Schedule */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Network-Aware Schedule</h2>
          {networkSchedule && (
            <div className="space-y-2 text-sm">
              <div><strong>Sync Interval:</strong> {networkSchedule.interval / 1000}s</div>
              <div><strong>Batch Size:</strong> {networkSchedule.batchSize}</div>
              <div><strong>Priority:</strong> {networkSchedule.priority}</div>
            </div>
          )}
        </div>

        {/* Last Sync Result */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Last Sync Result</h2>
          {lastSyncResult ? (
            <div className="space-y-2 text-sm">
              <div><strong>Success:</strong> {lastSyncResult.success ? 'Yes' : 'No'}</div>
              <div><strong>Synced Count:</strong> {lastSyncResult.syncedCount}</div>
              <div><strong>Failed Count:</strong> {lastSyncResult.failedCount}</div>
              <div><strong>Errors:</strong> {lastSyncResult.errors.length}</div>
              <div><strong>Operation ID:</strong> {lastSyncResult.operationId}</div>
            </div>
          ) : (
            <p className="text-gray-500">No sync performed yet</p>
          )}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Enhanced Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-green-600">✓ Incremental Sync</h3>
            <p className="text-sm text-gray-600">Only syncs changes since last sync timestamp, reducing data transfer</p>
          </div>
          <div>
            <h3 className="font-medium text-green-600">✓ Batch Operations</h3>
            <p className="text-sm text-gray-600">Groups operations for efficient processing with configurable batch sizes</p>
          </div>
          <div>
            <h3 className="font-medium text-green-600">✓ Network Awareness</h3>
            <p className="text-sm text-gray-600">Adapts sync behavior based on network conditions (2G, 3G, 4G, WiFi)</p>
          </div>
          <div>
            <h3 className="font-medium text-green-600">✓ Data Compression</h3>
            <p className="text-sm text-gray-600">Compresses large data transfers using Web Workers for better performance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSyncExample;