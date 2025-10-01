import { useState, useEffect, useCallback } from 'react';
import { useOfflineQueueManager, useQueueOperations } from './useOfflineQueueManager';
import { OperationType, EntityType } from '../lib/types/local-storage';

export type OfflineItem<T> = {
  id: string;
  data: T;
  status: 'pending' | 'failed';
  createdAt: number;
};

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useOfflineQueueManager instead
 */
export function useOfflineQueue<T>(queueName: string) {
  const [queue, setQueue] = useState<OfflineItem<T>[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQueue = localStorage.getItem(queueName);
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    }
  }, [queueName]);

  const updateLocalStorage = (newQueue: OfflineItem<T>[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(queueName, JSON.stringify(newQueue));
    }
  };

  const addToQueue = (itemData: T) => {
    const newItem: OfflineItem<T> = {
      id: `offline-${Date.now()}`,
      data: itemData,
      status: 'pending',
      createdAt: Date.now(),
    };
    setQueue(prevQueue => {
      const newQueue = [...prevQueue, newItem];
      updateLocalStorage(newQueue);
      return newQueue;
    });
    return newItem;
  };

  const removeFromQueue = (itemId: string) => {
    setQueue(prevQueue => {
      const newQueue = prevQueue.filter(item => item.id !== itemId);
      updateLocalStorage(newQueue);
      return newQueue;
    });
  };

  const updateItemStatus = (itemId: string, status: 'pending' | 'failed') => {
    setQueue(prevQueue => {
      const newQueue = prevQueue.map(item => 
        item.id === itemId ? { ...item, status } : item
      );
      updateLocalStorage(newQueue);
      return newQueue;
    });
  };

  return {
    queue,
    addToQueue,
    removeFromQueue,
    updateItemStatus,
  };
}

/**
 * Enhanced offline queue hook using the new OfflineQueueManager
 */
export function useEnhancedOfflineQueue() {
  const queueManager = useOfflineQueueManager({
    config: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 60000,
      backoffFactor: 2,
      jitter: true,
      maxQueueSize: 1000,
      batchSize: 10,
      processingTimeout: 30000,
      deduplicationWindow: 5000
    },
    autoStart: true
  });

  const queueOperations = useQueueOperations();

  // Helper functions for common operations
  const addExpenseOperation = useCallback(async (
    type: OperationType,
    expenseId: string,
    expenseData: any
  ) => {
    const operation = queueOperations.createExpenseOperation(type, expenseId, expenseData);
    return await queueManager.addOperation(operation);
  }, [queueManager, queueOperations]);

  const addIncomeOperation = useCallback(async (
    type: OperationType,
    incomeId: string,
    incomeData: any
  ) => {
    const operation = queueOperations.createIncomeOperation(type, incomeId, incomeData);
    return await queueManager.addOperation(operation);
  }, [queueManager, queueOperations]);

  const addCardOperation = useCallback(async (
    type: OperationType,
    cardId: string,
    cardData: any
  ) => {
    const operation = queueOperations.createCardOperation(type, cardId, cardData);
    return await queueManager.addOperation(operation);
  }, [queueManager, queueOperations]);

  const addCategoryOperation = useCallback(async (
    type: OperationType,
    categoryId: string,
    categoryData: any
  ) => {
    const operation = queueOperations.createCategoryOperation(type, categoryId, categoryData);
    return await queueManager.addOperation(operation);
  }, [queueManager, queueOperations]);

  return {
    ...queueManager,
    addExpenseOperation,
    addIncomeOperation,
    addCardOperation,
    addCategoryOperation,
    queueOperations
  };
}
