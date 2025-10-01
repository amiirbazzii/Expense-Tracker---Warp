/**
 * OfflineQueueManager - Robust offline queue management system
 * 
 * Features:
 * - Operation deduplication and conflict prevention
 * - Persistent queue that survives app restarts
 * - Intelligent retry mechanisms with exponential backoff
 * - Priority-based sync ordering
 */

import * as localforage from 'localforage';
import {
  PendingOperation,
  OperationType,
  EntityType,
  QueueStatus,
  SyncResult,
  SyncError
} from '../types/local-storage';

export interface QueueConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
  maxQueueSize: number;
  batchSize: number;
  processingTimeout: number; // milliseconds
  deduplicationWindow: number; // milliseconds
  autoProcess?: boolean; // Whether to automatically process queue
  testMode?: boolean; // Disable automatic processing for tests
}

export interface OperationPriority {
  type: OperationType;
  entityType: EntityType;
  priority: number;
  weight: number;
}

export interface QueueMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageRetryCount: number;
  averageProcessingTime: number;
  lastProcessedAt: number;
  queueHealth: 'healthy' | 'degraded' | 'critical';
}

export type QueueEventType = 
  | 'operation_added'
  | 'operation_processing'
  | 'operation_completed'
  | 'operation_failed'
  | 'operation_retrying'
  | 'queue_empty'
  | 'queue_full'
  | 'batch_processing'
  | 'batch_completed';

export interface QueueEvent {
  type: QueueEventType;
  operation?: PendingOperation;
  batch?: PendingOperation[];
  error?: string;
  timestamp: number;
}

export type QueueEventListener = (event: QueueEvent) => void;

/**
 * OfflineQueueManager handles all offline operations with robust retry mechanisms,
 * deduplication, priority ordering, and persistent storage.
 */
export class OfflineQueueManager {
  private storage: typeof localforage;
  private config: QueueConfig;
  private isProcessing = false;
  private processingOperations = new Set<string>();
  private eventListeners = new Set<QueueEventListener>();
  private metrics: QueueMetrics;
  private priorityRules: OperationPriority[];
  private deduplicationCache = new Map<string, number>();
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 60000,
      backoffFactor: 2,
      jitter: true,
      maxQueueSize: 1000,
      batchSize: 10,
      processingTimeout: 30000,
      deduplicationWindow: 5000,
      autoProcess: true,
      testMode: false,
      ...config
    };

    this.storage = localforage.createInstance({
      name: 'OfflineQueue',
      storeName: 'pending_operations',
      description: 'Persistent offline operation queue'
    });

    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageRetryCount: 0,
      averageProcessingTime: 0,
      lastProcessedAt: 0,
      queueHealth: 'healthy'
    };

    this.priorityRules = [
      { type: 'create', entityType: 'expenses', priority: 10, weight: 1.0 },
      { type: 'update', entityType: 'expenses', priority: 8, weight: 0.9 },
      { type: 'delete', entityType: 'expenses', priority: 6, weight: 0.7 },
      { type: 'create', entityType: 'income', priority: 9, weight: 0.95 },
      { type: 'update', entityType: 'income', priority: 7, weight: 0.85 },
      { type: 'delete', entityType: 'income', priority: 5, weight: 0.65 },
      { type: 'create', entityType: 'cards', priority: 12, weight: 1.1 },
      { type: 'update', entityType: 'cards', priority: 10, weight: 1.0 },
      { type: 'delete', entityType: 'cards', priority: 4, weight: 0.6 },
      { type: 'create', entityType: 'categories', priority: 11, weight: 1.05 },
      { type: 'update', entityType: 'categories', priority: 9, weight: 0.95 },
      { type: 'delete', entityType: 'categories', priority: 3, weight: 0.55 },
      { type: 'create', entityType: 'forValues', priority: 8, weight: 0.8 },
      { type: 'update', entityType: 'forValues', priority: 6, weight: 0.7 },
      { type: 'delete', entityType: 'forValues', priority: 2, weight: 0.5 },
      { type: 'create', entityType: 'incomeCategories', priority: 7, weight: 0.75 },
      { type: 'update', entityType: 'incomeCategories', priority: 5, weight: 0.65 },
      { type: 'delete', entityType: 'incomeCategories', priority: 1, weight: 0.45 }
    ];

    this.initialize();
  }

  /**
   * Initialize the queue manager
   */
  private async initialize(): Promise<void> {
    try {
      // Load existing metrics
      const savedMetrics = await this.storage.getItem<QueueMetrics>('queue_metrics');
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...savedMetrics };
      }

      // Clean up any stale processing operations
      await this.cleanupStaleOperations();

      // Start periodic processing if not in test mode
      if (!this.config.testMode) {
        this.startPeriodicProcessing();
      }

      console.log('OfflineQueueManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineQueueManager:', error);
    }
  }

  /**
   * Add an operation to the queue with deduplication
   */
  async addOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    try {
      // Generate operation ID
      const operationId = this.generateOperationId(operation);

      // Check for deduplication
      const existingOperationId = await this.findExistingOperation(operation);
      if (existingOperationId) {
        console.log(`Duplicate operation detected, skipping: ${operationId}`);
        return existingOperationId;
      }

      // Check queue size limit
      const currentQueue = await this.getQueue();
      if (currentQueue.length >= this.config.maxQueueSize) {
        await this.cleanupCompletedOperations();
        
        const updatedQueue = await this.getQueue();
        if (updatedQueue.length >= this.config.maxQueueSize) {
          throw new Error('Queue is full, cannot add more operations');
        }
      }

      // Create the pending operation
      const pendingOperation: PendingOperation = {
        ...operation,
        id: operationId,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };

      // Add to queue
      await this.storage.setItem(operationId, pendingOperation);

      // Update deduplication cache
      this.deduplicationCache.set(this.getDeduplicationKey(operation), Date.now());

      // Update metrics
      this.metrics.totalOperations++;
      await this.saveMetrics();

      // Emit event
      this.emitEvent({
        type: 'operation_added',
        operation: pendingOperation,
        timestamp: Date.now()
      });

      // Trigger processing if not already running and auto-processing is enabled
      if (!this.isProcessing && this.config.autoProcess && !this.config.testMode) {
        this.processQueue();
      }

      return operationId;
    } catch (error) {
      console.error('Failed to add operation to queue:', error);
      throw error;
    }
  }

  /**
   * Process the queue with priority ordering and batching
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      const pendingOperations = queue.filter(op => 
        op.status === 'pending' && !this.processingOperations.has(op.id)
      );

      if (pendingOperations.length === 0) {
        this.emitEvent({
          type: 'queue_empty',
          timestamp: Date.now()
        });
        return;
      }

      // Sort operations by priority
      const sortedOperations = this.sortOperationsByPriority(pendingOperations);

      // Process in batches
      const batches = this.createBatches(sortedOperations);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

    } catch (error) {
      console.error('Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(batch: PendingOperation[]): Promise<void> {
    this.emitEvent({
      type: 'batch_processing',
      batch,
      timestamp: Date.now()
    });

    const batchPromises = batch.map(operation => this.processOperation(operation));
    
    try {
      await Promise.allSettled(batchPromises);
      
      this.emitEvent({
        type: 'batch_completed',
        batch,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }

  /**
   * Process a single operation with retry logic
   */
  private async processOperation(operation: PendingOperation): Promise<void> {
    if (this.processingOperations.has(operation.id)) {
      return;
    }

    this.processingOperations.add(operation.id);

    try {
      // Update operation status
      operation.status = 'syncing';
      await this.storage.setItem(operation.id, operation);

      this.emitEvent({
        type: 'operation_processing',
        operation,
        timestamp: Date.now()
      });

      const startTime = Date.now();

      // Simulate processing (in real implementation, this would call the sync manager)
      await this.simulateOperationProcessing(operation);

      const processingTime = Date.now() - startTime;

      // Mark as completed
      operation.status = 'completed';
      operation.timestamp = Date.now();
      await this.storage.setItem(operation.id, operation);

      // Update metrics
      this.metrics.successfulOperations++;
      this.updateAverageProcessingTime(processingTime);
      this.metrics.lastProcessedAt = Date.now();
      await this.saveMetrics();

      this.emitEvent({
        type: 'operation_completed',
        operation,
        timestamp: Date.now()
      });

    } catch (error) {
      await this.handleOperationFailure(operation, error);
    } finally {
      this.processingOperations.delete(operation.id);
    }
  }

  /**
   * Handle operation failure with retry logic
   */
  private async handleOperationFailure(operation: PendingOperation, error: any): Promise<void> {
    operation.retryCount++;
    operation.error = error instanceof Error ? error.message : 'Unknown error';

    if (operation.retryCount >= operation.maxRetries) {
      // Max retries reached, mark as failed
      operation.status = 'failed';
      this.metrics.failedOperations++;
      
      this.emitEvent({
        type: 'operation_failed',
        operation,
        error: operation.error,
        timestamp: Date.now()
      });
    } else {
      // Schedule retry with exponential backoff
      operation.status = 'pending';
      
      const delay = this.calculateRetryDelay(operation.retryCount);
      
      this.emitEvent({
        type: 'operation_retrying',
        operation,
        timestamp: Date.now()
      });

      setTimeout(() => {
        this.processOperation(operation);
      }, delay);
    }

    await this.storage.setItem(operation.id, operation);
    await this.saveMetrics();
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    let delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffFactor, retryCount - 1),
      this.config.maxDelay
    );

    if (this.config.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(delay, this.config.baseDelay);
  }

  /**
   * Find existing operation that matches the given operation
   */
  private async findExistingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string | null> {
    // Check deduplication cache first
    const deduplicationKey = this.getDeduplicationKey(operation);
    const lastSeen = this.deduplicationCache.get(deduplicationKey);
    
    if (lastSeen && (Date.now() - lastSeen) < this.config.deduplicationWindow) {
      // Find the actual operation ID from the queue
      const queue = await this.getQueue();
      const existingOperation = queue.find(op => 
        op.type === operation.type &&
        op.entityType === operation.entityType &&
        op.entityId === operation.entityId &&
        op.status !== 'completed'
      );
      
      if (existingOperation) {
        return existingOperation.id;
      }
    }

    // Check for similar pending operations
    const queue = await this.getQueue();
    const similarOperation = queue.find(op => 
      op.type === operation.type &&
      op.entityType === operation.entityType &&
      op.entityId === operation.entityId &&
      op.status !== 'completed'
    );

    return similarOperation ? similarOperation.id : null;
  }

  /**
   * Check if operation is a duplicate
   */
  private async isDuplicate(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>, operationId: string): Promise<boolean> {
    const existingId = await this.findExistingOperation(operation);
    return existingId !== null && existingId !== operationId;
  }

  /**
   * Generate deduplication key for operation
   */
  private getDeduplicationKey(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    return `${operation.type}_${operation.entityType}_${operation.entityId}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${operation.type}_${operation.entityType}_${operation.entityId}_${timestamp}_${random}`;
  }

  /**
   * Sort operations by priority
   */
  private sortOperationsByPriority(operations: PendingOperation[]): PendingOperation[] {
    return operations.sort((a, b) => {
      const priorityA = this.getOperationPriority(a);
      const priorityB = this.getOperationPriority(b);

      // Higher priority first
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // If same priority, older operations first
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Get operation priority based on type and entity
   */
  private getOperationPriority(operation: PendingOperation): number {
    const rule = this.priorityRules.find(r => 
      r.type === operation.type && r.entityType === operation.entityType
    );

    if (!rule) {
      return 0; // Default priority
    }

    let priority = rule.priority;

    // Boost priority for operations that have failed before
    if (operation.retryCount > 0) {
      priority += operation.retryCount * 2;
    }

    // Boost priority for recent operations
    const age = Date.now() - operation.timestamp;
    if (age < 60000) { // Less than 1 minute
      priority += 5;
    } else if (age < 300000) { // Less than 5 minutes
      priority += 2;
    }

    return priority * rule.weight;
  }

  /**
   * Create batches from sorted operations
   */
  private createBatches(operations: PendingOperation[]): PendingOperation[][] {
    const batches: PendingOperation[][] = [];
    
    for (let i = 0; i < operations.length; i += this.config.batchSize) {
      batches.push(operations.slice(i, i + this.config.batchSize));
    }

    return batches;
  }

  /**
   * Simulate operation processing (replace with actual sync logic)
   */
  private async simulateOperationProcessing(operation: PendingOperation): Promise<void> {
    // Simulate network delay and potential failures
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate 10% failure rate for testing
    if (Math.random() < 0.1) {
      throw new Error(`Simulated failure for operation ${operation.id}`);
    }
  }

  /**
   * Get all operations in the queue
   */
  async getQueue(): Promise<PendingOperation[]> {
    try {
      const keys = await this.storage.keys();
      const operations: PendingOperation[] = [];

      for (const key of keys) {
        if (key !== 'queue_metrics') {
          const operation = await this.storage.getItem<PendingOperation>(key);
          if (operation) {
            operations.push(operation);
          }
        }
      }

      return operations;
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const queue = await this.getQueue();
    
    const pending = queue.filter(op => op.status === 'pending').length;
    const processing = queue.filter(op => op.status === 'syncing').length;
    const failed = queue.filter(op => op.status === 'failed').length;
    const completed = queue.filter(op => op.status === 'completed').length;

    return {
      pending,
      processing,
      failed,
      completed,
      lastProcessed: this.metrics.lastProcessedAt > 0 ? new Date(this.metrics.lastProcessedAt) : null,
      estimatedSyncTime: this.estimateSyncTime(pending + processing)
    };
  }

  /**
   * Estimate sync time based on queue size and average processing time
   */
  private estimateSyncTime(operationCount: number): number {
    if (operationCount === 0) return 0;
    
    const avgTime = this.metrics.averageProcessingTime || 2000; // Default 2 seconds
    const batchCount = Math.ceil(operationCount / this.config.batchSize);
    
    return batchCount * avgTime;
  }

  /**
   * Clean up completed operations older than specified time
   */
  async cleanupCompletedOperations(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const queue = await this.getQueue();
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const operation of queue) {
      if (operation.status === 'completed' && operation.timestamp < cutoffTime) {
        await this.storage.removeItem(operation.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Clean up stale processing operations
   */
  private async cleanupStaleOperations(): Promise<void> {
    const queue = await this.getQueue();
    const staleTime = Date.now() - this.config.processingTimeout;

    for (const operation of queue) {
      if (operation.status === 'syncing' && operation.timestamp < staleTime) {
        operation.status = 'pending';
        await this.storage.setItem(operation.id, operation);
      }
    }
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<number> {
    const queue = await this.getQueue();
    const failedOperations = queue.filter(op => op.status === 'failed');

    for (const operation of failedOperations) {
      if (operation.retryCount < operation.maxRetries) {
        operation.status = 'pending';
        operation.retryCount = 0; // Reset retry count for manual retry
        await this.storage.setItem(operation.id, operation);
      }
    }

    if (failedOperations.length > 0 && !this.isProcessing) {
      this.processQueue();
    }

    return failedOperations.length;
  }

  /**
   * Clear all operations from the queue
   */
  async clearQueue(): Promise<void> {
    const keys = await this.storage.keys();
    
    for (const key of keys) {
      if (key !== 'queue_metrics') {
        await this.storage.removeItem(key);
      }
    }

    this.processingOperations.clear();
    this.deduplicationCache.clear();
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    if (this.metrics.averageProcessingTime === 0) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      // Exponential moving average
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * 0.8) + (newTime * 0.2);
    }
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await this.storage.setItem('queue_metrics', this.metrics);
    } catch (error) {
      console.error('Failed to save queue metrics:', error);
    }
  }

  /**
   * Start periodic processing
   */
  private startPeriodicProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    this.processingTimer = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, 30000); // Process every 30 seconds
  }

  /**
   * Stop periodic processing
   */
  stopPeriodicProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: QueueEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: QueueEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: QueueEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Dispose of the queue manager
   */
  dispose(): void {
    this.stopPeriodicProcessing();
    this.eventListeners.clear();
    this.processingOperations.clear();
    this.deduplicationCache.clear();
  }
}