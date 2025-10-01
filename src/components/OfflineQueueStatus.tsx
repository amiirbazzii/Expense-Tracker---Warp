/**
 * OfflineQueueStatus - UI component for displaying and managing offline queue
 */

import React, { useState } from 'react';
import { useEnhancedOfflineQueue } from '../hooks/useOfflineQueue';
import { useQueueMonitoring } from '../hooks/useOfflineQueueManager';

interface OfflineQueueStatusProps {
  className?: string;
  showDetails?: boolean;
  showControls?: boolean;
}

export const OfflineQueueStatus: React.FC<OfflineQueueStatusProps> = ({
  className = '',
  showDetails = false,
  showControls = false
}) => {
  const queueManager = useEnhancedOfflineQueue();
  const { healthStatus, recommendations } = useQueueMonitoring(queueManager);
  const [showEvents, setShowEvents] = useState(false);

  const {
    queueStatus,
    metrics,
    isProcessing,
    events,
    processQueue,
    retryFailedOperations,
    clearQueue,
    clearEvents,
    cleanup
  } = queueManager;

  const handleRetryFailed = async () => {
    try {
      const retriedCount = await retryFailedOperations();
      console.log(`Retried ${retriedCount} failed operations`);
    } catch (error) {
      console.error('Failed to retry operations:', error);
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear all queue operations?')) {
      try {
        await clearQueue();
        console.log('Queue cleared successfully');
      } catch (error) {
        console.error('Failed to clear queue:', error);
      }
    }
  };

  const handleCleanup = async () => {
    try {
      const cleanedCount = await cleanup();
      console.log(`Cleaned up ${cleanedCount} old operations`);
    } catch (error) {
      console.error('Failed to cleanup operations:', error);
    }
  };

  const handleProcessQueue = async () => {
    try {
      await processQueue();
      console.log('Queue processing triggered');
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!queueStatus) {
    return (
      <div className={`p-4 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-gray-500">Loading queue status...</div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Offline Queue</h3>
        <div className={`flex items-center space-x-2 ${getHealthStatusColor(healthStatus)}`}>
          <span>{getHealthStatusIcon(healthStatus)}</span>
          <span className="text-sm font-medium capitalize">{healthStatus}</span>
        </div>
      </div>

      {/* Queue Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{queueStatus.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{queueStatus.processing}</div>
          <div className="text-sm text-gray-500">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{queueStatus.failed}</div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{queueStatus.completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 text-sm">Processing queue operations...</span>
          </div>
        </div>
      )}

      {/* Estimated Sync Time */}
      {queueStatus.estimatedSyncTime && queueStatus.estimatedSyncTime > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Estimated sync time: {formatTime(queueStatus.estimatedSyncTime)}
        </div>
      )}

      {/* Last Processed */}
      {queueStatus.lastProcessed && (
        <div className="mb-4 text-sm text-gray-600">
          Last processed: {queueStatus.lastProcessed.toLocaleString()}
        </div>
      )}

      {/* Health Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm font-medium text-yellow-800 mb-2">Recommendations:</div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleProcessQueue}
            disabled={isProcessing}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Process Queue
          </button>
          
          {queueStatus.failed > 0 && (
            <button
              onClick={handleRetryFailed}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Retry Failed ({queueStatus.failed})
            </button>
          )}
          
          <button
            onClick={handleCleanup}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Cleanup
          </button>
          
          <button
            onClick={handleClearQueue}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Clear Queue
          </button>
        </div>
      )}

      {/* Detailed Metrics */}
      {showDetails && metrics && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Detailed Metrics</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Operations:</span>
              <span className="ml-2 font-medium">{metrics.totalOperations}</span>
            </div>
            <div>
              <span className="text-gray-500">Success Rate:</span>
              <span className="ml-2 font-medium">
                {metrics.totalOperations > 0 
                  ? `${((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Processing Time:</span>
              <span className="ml-2 font-medium">
                {metrics.averageProcessingTime > 0 
                  ? formatTime(metrics.averageProcessingTime)
                  : 'N/A'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Retry Count:</span>
              <span className="ml-2 font-medium">{metrics.averageRetryCount.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Events Log */}
      {showDetails && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">Recent Events</div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showEvents ? 'Hide' : 'Show'} Events ({events.length})
              </button>
              {events.length > 0 && (
                <button
                  onClick={clearEvents}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {showEvents && (
            <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
              {events.length === 0 ? (
                <div className="text-xs text-gray-500">No recent events</div>
              ) : (
                <div className="space-y-1">
                  {events.slice(-10).reverse().map((event, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="ml-2 font-medium">{event.type}</span>
                      {event.operation && (
                        <span className="ml-2 text-gray-600">
                          {event.operation.type} {event.operation.entityType}
                        </span>
                      )}
                      {event.error && (
                        <span className="ml-2 text-red-600">Error: {event.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineQueueStatus;