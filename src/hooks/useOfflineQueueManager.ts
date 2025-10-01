/**
 * React hook for managing offline queue operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineQueueManager, QueueConfig, QueueEvent, QueueMetrics } from '../lib/queue/OfflineQueueManager';
import { PendingOperation, QueueStatus, OperationType, EntityType } from '../lib/types/local-storage';

export interface UseOfflineQueueManagerOptions {
  config?: Partial<QueueConfig>;
  autoStart?: boolean;
}

export interface UseOfflineQueueManagerResult {
  // Queue operations
  addOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) => Promise<string>;
  processQueue: () => Promise<void>;
  retryFailedOperations: () => Promise<number>;
  clearQueue: () => Promise<void>;
  
  // Queue status
  queueStatus: QueueStatus | null;
  metrics: QueueMetrics | null;
  isProcessing: boolean;
  
  // Event handling
  events: QueueEvent[];
  clearEvents: () => void;
  
  // Utility functions
  refreshStatus: () => Promise<void>;
  cleanup: () => Promise<number>;
}

/**
 * Hook for managing offline queue operations with React integration
 */
export function useOfflineQueueManager(options: UseOfflineQueueManagerOptions = {}): UseOfflineQueueManagerResult {
  const { config, autoStart = true } = options;
  
  const queueManagerRef = useRef<OfflineQueueManager | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState<QueueEvent[]>([]);

  // Initialize queue manager
  useEffect(() => {
    if (!queueManagerRef.current) {
      queueManagerRef.current = new OfflineQueueManager(config);
      
      // Set up event listeners
      const handleQueueEvent = (event: QueueEvent) => {
        setEvents(prev => [...prev.slice(-49), event]); // Keep last 50 events
        
        // Update processing state based on events
        if (event.type === 'batch_processing') {
          setIsProcessing(true);
        } else if (event.type === 'batch_completed' || event.type === 'queue_empty') {
          setIsProcessing(false);
        }
      };

      queueManagerRef.current.addEventListener(handleQueueEvent);

      // Initial status refresh
      if (autoStart) {
        refreshStatus();
      }
    }

    return () => {
      if (queueManagerRef.current) {
        queueManagerRef.current.dispose();
        queueManagerRef.current = null;
      }
    };
  }, [config, autoStart]);

  // Refresh queue status and metrics
  const refreshStatus = useCallback(async () => {
    if (!queueManagerRef.current) return;

    try {
      const [status, currentMetrics] = await Promise.all([
        queueManagerRef.current.getQueueStatus(),
        Promise.resolve(queueManagerRef.current.getMetrics())
      ]);

      setQueueStatus(status);
      setMetrics(currentMetrics);
    } catch (error) {
      console.error('Failed to refresh queue status:', error);
    }
  }, []);

  // Periodic status refresh
  useEffect(() => {
    const interval = setInterval(refreshStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Add operation to queue
  const addOperation = useCallback(async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> => {
    if (!queueManagerRef.current) {
      throw new Error('Queue manager not initialized');
    }

    try {
      const operationId = await queueManagerRef.current.addOperation(operation);
      await refreshStatus();
      return operationId;
    } catch (error) {
      console.error('Failed to add operation to queue:', error);
      throw error;
    }
  }, [refreshStatus]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (!queueManagerRef.current) return;

    try {
      setIsProcessing(true);
      await queueManagerRef.current.processQueue();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to process queue:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [refreshStatus]);

  // Retry failed operations
  const retryFailedOperations = useCallback(async (): Promise<number> => {
    if (!queueManagerRef.current) return 0;

    try {
      const retriedCount = await queueManagerRef.current.retryFailedOperations();
      await refreshStatus();
      return retriedCount;
    } catch (error) {
      console.error('Failed to retry failed operations:', error);
      return 0;
    }
  }, [refreshStatus]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    if (!queueManagerRef.current) return;

    try {
      await queueManagerRef.current.clearQueue();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }, [refreshStatus]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Cleanup old operations
  const cleanup = useCallback(async (): Promise<number> => {
    if (!queueManagerRef.current) return 0;

    try {
      const cleanedCount = await queueManagerRef.current.cleanupCompletedOperations();
      await refreshStatus();
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup operations:', error);
      return 0;
    }
  }, [refreshStatus]);

  return {
    addOperation,
    processQueue,
    retryFailedOperations,
    clearQueue,
    queueStatus,
    metrics,
    isProcessing,
    events,
    clearEvents,
    refreshStatus,
    cleanup
  };
}

/**
 * Hook for creating queue operations with proper typing
 */
export function useQueueOperations() {
  const createOperation = useCallback((
    type: OperationType,
    entityType: EntityType,
    entityId: string,
    data: any,
    maxRetries: number = 5
  ): Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'> => {
    return {
      type,
      entityType,
      entityId,
      data,
      maxRetries
    };
  }, []);

  const createExpenseOperation = useCallback((
    type: OperationType,
    expenseId: string,
    expenseData: any,
    maxRetries: number = 5
  ) => {
    return createOperation(type, 'expenses', expenseId, expenseData, maxRetries);
  }, [createOperation]);

  const createIncomeOperation = useCallback((
    type: OperationType,
    incomeId: string,
    incomeData: any,
    maxRetries: number = 5
  ) => {
    return createOperation(type, 'income', incomeId, incomeData, maxRetries);
  }, [createOperation]);

  const createCardOperation = useCallback((
    type: OperationType,
    cardId: string,
    cardData: any,
    maxRetries: number = 5
  ) => {
    return createOperation(type, 'cards', cardId, cardData, maxRetries);
  }, [createOperation]);

  const createCategoryOperation = useCallback((
    type: OperationType,
    categoryId: string,
    categoryData: any,
    maxRetries: number = 5
  ) => {
    return createOperation(type, 'categories', categoryId, categoryData, maxRetries);
  }, [createOperation]);

  return {
    createOperation,
    createExpenseOperation,
    createIncomeOperation,
    createCardOperation,
    createCategoryOperation
  };
}

/**
 * Hook for monitoring queue health and performance
 */
export function useQueueMonitoring(queueManager: UseOfflineQueueManagerResult) {
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (!queueManager.metrics || !queueManager.queueStatus) return;

    const { metrics, queueStatus } = queueManager;
    const newRecommendations: string[] = [];
    let newHealthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check failure rate
    const totalOperations = metrics.successfulOperations + metrics.failedOperations;
    const failureRate = totalOperations > 0 ? metrics.failedOperations / totalOperations : 0;

    if (failureRate > 0.5) {
      newHealthStatus = 'critical';
      newRecommendations.push('High failure rate detected. Check network connectivity.');
    } else if (failureRate > 0.2) {
      newHealthStatus = 'degraded';
      newRecommendations.push('Elevated failure rate. Monitor network conditions.');
    }

    // Check queue size
    const totalPending = queueStatus.pending + queueStatus.processing;
    if (totalPending > 100) {
      newHealthStatus = 'critical';
      newRecommendations.push('Large queue detected. Consider manual sync or cleanup.');
    } else if (totalPending > 50) {
      if (newHealthStatus === 'healthy') newHealthStatus = 'degraded';
      newRecommendations.push('Queue is growing. Monitor sync performance.');
    }

    // Check failed operations
    if (queueStatus.failed > 20) {
      newHealthStatus = 'critical';
      newRecommendations.push('Many failed operations. Review and retry failed items.');
    } else if (queueStatus.failed > 10) {
      if (newHealthStatus === 'healthy') newHealthStatus = 'degraded';
      newRecommendations.push('Some operations failed. Consider retrying failed items.');
    }

    // Check processing time
    if (metrics.averageProcessingTime > 10000) {
      if (newHealthStatus === 'healthy') newHealthStatus = 'degraded';
      newRecommendations.push('Slow processing detected. Check network speed.');
    }

    setHealthStatus(newHealthStatus);
    setRecommendations(newRecommendations);
  }, [queueManager.metrics, queueManager.queueStatus]);

  return {
    healthStatus,
    recommendations
  };
}