/**
 * PerformanceOptimizer provides intelligent strategies for optimizing
 * local-first data operations, background sync, and resource management
 */

import { LocalStorageManager } from '../storage/LocalStorageManager';
import { CloudSyncManager } from '../sync/CloudSyncManager';
import { ConflictDetector } from '../sync/ConflictDetector';
import { PendingOperation, SyncResult } from '../types/local-storage';

/**
 * Configuration for performance optimization strategies
 */
interface OptimizationConfig {
  // Background sync settings
  syncInterval: number; // milliseconds
  maxBatchSize: number;
  syncOnVisibilityChange: boolean;
  syncOnNetworkChange: boolean;
  
  // Caching settings
  enableQueryCaching: boolean;
  cacheExpirationTime: number; // milliseconds
  maxCacheSize: number; // number of queries to cache
  
  // Performance settings
  debounceDelay: number; // milliseconds
  throttleDelay: number; // milliseconds
  enableLazyLoading: boolean;
  
  // Resource management
  maxRetryAttempts: number;
  cleanupInterval: number; // milliseconds
  maxPendingOperations: number;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  syncInterval: 30000, // 30 seconds
  maxBatchSize: 50,
  syncOnVisibilityChange: true,
  syncOnNetworkChange: true,
  
  enableQueryCaching: true,
  cacheExpirationTime: 300000, // 5 minutes
  maxCacheSize: 100,
  
  debounceDelay: 500,
  throttleDelay: 1000,
  enableLazyLoading: true,
  
  maxRetryAttempts: 3,
  cleanupInterval: 600000, // 10 minutes
  maxPendingOperations: 1000
};

/**
 * Query cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
  hitCount: number;
}

/**
 * Background sync task
 */
interface SyncTask {
  id: string;
  priority: 'low' | 'medium' | 'high';
  operation: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: number;
}

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics {
  syncOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  cacheHitRate: number;
  pendingOperations: number;
  lastSyncTime?: number;
}

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private localStorageManager: LocalStorageManager;
  private cloudSyncManager: CloudSyncManager;
  private conflictDetector: ConflictDetector;
  
  // Cache management
  private queryCache = new Map<string, CacheEntry<any>>();
  
  // Background sync management
  private syncQueue: SyncTask[] = [];
  private activeSyncs = new Set<string>();
  private syncInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  // Performance tracking
  private metrics: PerformanceMetrics = {
    syncOperations: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    cacheHitRate: 0,
    pendingOperations: 0
  };
  
  // Debounce and throttle tracking
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private throttleTimers = new Map<string, number>();
  
  constructor(
    localStorageManager: LocalStorageManager,
    cloudSyncManager: CloudSyncManager,
    conflictDetector: ConflictDetector,
    config?: Partial<OptimizationConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localStorageManager = localStorageManager;
    this.cloudSyncManager = cloudSyncManager;
    this.conflictDetector = conflictDetector;
    
    this.initialize();
  }
  
  /**
   * Initialize performance optimization strategies
   */
  private initialize(): void {
    this.setupBackgroundSync();
    this.setupEventListeners();
    this.setupCleanupTasks();
  }
  
  /**
   * Set up background sync process
   */
  private setupBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && this.syncQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }
  
  /**
   * Set up event listeners for optimization triggers
   */
  private setupEventListeners(): void {
    // Network change events
    if (this.config.syncOnNetworkChange) {
      window.addEventListener('online', () => {
        this.handleNetworkChange(true);
      });
      
      window.addEventListener('offline', () => {
        this.handleNetworkChange(false);
      });
    }
    
    // Visibility change events
    if (this.config.syncOnVisibilityChange) {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.handleVisibilityChange();
        }
      });
    }
    
    // Page unload events for cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
  
  /**
   * Set up periodic cleanup tasks
   */
  private setupCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Handle network connectivity changes
   */
  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      // Prioritize sync when coming back online
      await this.processSyncQueue('high');
    } else {
      // Clear active syncs when going offline
      this.activeSyncs.clear();
    }
  }
  
  /**
   * Handle page visibility changes
   */
  private async handleVisibilityChange(): Promise<void> {
    if (navigator.onLine) {
      // Sync when user returns to the app
      await this.processSyncQueue('medium');
    }
  }
  
  /**
   * Add operation to background sync queue
   */
  addToSyncQueue(
    operation: () => Promise<any>,
    priority: 'low' | 'medium' | 'high' = 'medium',
    maxRetries: number = this.config.maxRetryAttempts
  ): string {
    const taskId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: SyncTask = {
      id: taskId,
      priority,
      operation,
      retryCount: 0,
      maxRetries
    };
    
    // Insert based on priority
    const insertIndex = this.findInsertIndex(priority);
    this.syncQueue.splice(insertIndex, 0, task);
    
    // Limit queue size
    if (this.syncQueue.length > this.config.maxPendingOperations) {
      this.syncQueue = this.syncQueue.slice(0, this.config.maxPendingOperations);
    }
    
    this.metrics.pendingOperations = this.syncQueue.length;
    
    return taskId;
  }
  
  /**
   * Find insertion index based on priority
   */
  private findInsertIndex(priority: 'low' | 'medium' | 'high'): number {
    const priorities = { high: 3, medium: 2, low: 1 };
    const targetPriority = priorities[priority];
    
    for (let i = 0; i < this.syncQueue.length; i++) {
      const currentPriority = priorities[this.syncQueue[i].priority];
      if (targetPriority > currentPriority) {
        return i;
      }
    }
    
    return this.syncQueue.length;
  }
  
  /**
   * Process sync queue with optional priority filtering
   */
  private async processSyncQueue(minPriority?: 'low' | 'medium' | 'high'): Promise<void> {
    const priorities = { high: 3, medium: 2, low: 1 };
    const minPriorityValue = minPriority ? priorities[minPriority] : 1;
    
    const tasksToProcess = this.syncQueue
      .filter(task => 
        !this.activeSyncs.has(task.id) && 
        priorities[task.priority] >= minPriorityValue
      )
      .slice(0, this.config.maxBatchSize);
    
    const promises = tasksToProcess.map(task => this.executeTask(task));
    await Promise.allSettled(promises);
  }
  
  /**
   * Execute individual sync task
   */
  private async executeTask(task: SyncTask): Promise<void> {
    this.activeSyncs.add(task.id);
    const startTime = Date.now();
    
    try {
      await task.operation();
      
      // Remove completed task
      this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
    } catch (error) {
      console.error(`Sync task ${task.id} failed:`, error);
      
      task.retryCount++;
      task.lastAttempt = Date.now();
      
      if (task.retryCount >= task.maxRetries) {
        // Remove failed task after max retries
        this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
        this.updateMetrics(false, Date.now() - startTime);
      } else {
        // Schedule for retry with exponential backoff
        setTimeout(() => {
          this.activeSyncs.delete(task.id);
        }, Math.pow(2, task.retryCount) * 1000);
      }
    } finally {
      this.activeSyncs.delete(task.id);
      this.metrics.pendingOperations = this.syncQueue.length;
    }
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.syncOperations++;
    
    if (success) {
      this.metrics.successfulSyncs++;
      this.metrics.lastSyncTime = Date.now();
    } else {
      this.metrics.failedSyncs++;
    }
    
    // Update average sync time (moving average)
    this.metrics.averageSyncTime = 
      (this.metrics.averageSyncTime * (this.metrics.syncOperations - 1) + duration) / 
      this.metrics.syncOperations;
  }
  
  /**
   * Optimized query with caching
   */
  async optimizedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options?: { forceRefresh?: boolean; ttl?: number }
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(key);
    const now = Date.now();
    const ttl = options?.ttl || this.config.cacheExpirationTime;
    
    // Check cache if enabled and not forcing refresh
    if (this.config.enableQueryCaching && !options?.forceRefresh) {
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && (now - cached.timestamp) < ttl) {
        cached.hitCount++;
        this.updateCacheHitRate(true);
        return cached.data;
      }
    }
    
    // Execute query
    const data = await queryFn();
    
    // Cache result if enabled
    if (this.config.enableQueryCaching) {
      this.setCache(cacheKey, data, now);
      this.updateCacheHitRate(false);
    }
    
    return data;
  }
  
  /**
   * Set cache entry with LRU eviction
   */
  private setCache<T>(key: string, data: T, timestamp: number): void {
    // Evict oldest entries if cache is full
    if (this.queryCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }
    
    this.queryCache.set(key, {
      data,
      timestamp,
      key,
      hitCount: 0
    });
  }
  
  /**
   * Find oldest cache entry for LRU eviction
   */
  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.queryCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * Update cache hit rate metric
   */
  private updateCacheHitRate(hit: boolean): void {
    const totalQueries = this.metrics.syncOperations || 1;
    const hits = hit ? 1 : 0;
    
    this.metrics.cacheHitRate = 
      (this.metrics.cacheHitRate * (totalQueries - 1) + hits) / totalQueries;
  }
  
  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(key: string): string {
    return `query_${key}_${Date.now().toString(36)}`;
  }
  
  /**
   * Debounced operation execution
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = this.config.debounceDelay
  ): T {
    return ((...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delay);
      
      this.debounceTimers.set(key, timer);
    }) as T;
  }
  
  /**
   * Throttled operation execution
   */
  throttle<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = this.config.throttleDelay
  ): T {
    return ((...args: Parameters<T>) => {
      const lastExecution = this.throttleTimers.get(key) || 0;
      const now = Date.now();
      
      if (now - lastExecution >= delay) {
        fn(...args);
        this.throttleTimers.set(key, now);
      }
    }) as T;
  }
  
  /**
   * Intelligent batch processing for operations
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = this.config.maxBatchSize
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Add small delay between batches to prevent overwhelming
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
  
  /**
   * Periodic cleanup of resources
   */
  private performCleanup(): void {
    // Clean expired cache entries
    const now = Date.now();
    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp > this.config.cacheExpirationTime) {
        this.queryCache.delete(key);
      }
    }
    
    // Clean up completed timers
    for (const [key, timer] of this.debounceTimers) {
      if (!timer) {
        this.debounceTimers.delete(key);
      }
    }
    
    // Clean old throttle entries
    for (const [key, timestamp] of this.throttleTimers) {
      if (now - timestamp > this.config.throttleDelay * 2) {
        this.throttleTimers.delete(key);
      }
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): {
    total: number;
    active: number;
    byPriority: { high: number; medium: number; low: number };
  } {
    const byPriority = this.syncQueue.reduce(
      (acc, task) => {
        acc[task.priority]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
    
    return {
      total: this.syncQueue.length,
      active: this.activeSyncs.size,
      byPriority
    };
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart background sync with new interval
    if (newConfig.syncInterval) {
      this.setupBackgroundSync();
    }
  }
  
  /**
   * Force immediate sync of all pending operations
   */
  async forceSyncAll(): Promise<SyncResult[]> {
    const allTasks = [...this.syncQueue];
    const results: SyncResult[] = [];
    
    for (const task of allTasks) {
      if (!this.activeSyncs.has(task.id)) {
        try {
          await this.executeTask(task);
          results.push({
            success: true,
            conflicts: [],
            errors: [],
            syncedCount: 1,
            failedCount: 0,
            operationId: task.id,
            timestamp: Date.now()
          });
        } catch (error) {
          results.push({
            success: false,
            conflicts: [],
            errors: [{
              entityType: 'expenses',
              entityId: task.id,
              operation: 'create',
              error: error instanceof Error ? error.message : 'Unknown error',
              retryable: true
            }],
            syncedCount: 0,
            failedCount: 1,
            operationId: task.id,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Cleanup resources on shutdown
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    this.queryCache.clear();
    this.syncQueue.length = 0;
    this.activeSyncs.clear();
  }
}"