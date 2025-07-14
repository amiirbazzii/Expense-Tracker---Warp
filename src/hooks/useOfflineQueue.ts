import { useState, useEffect, useCallback } from 'react';

export type OfflineItem<T> = {
  id: string;
  data: T;
  status: 'pending' | 'failed';
  createdAt: number;
};

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
