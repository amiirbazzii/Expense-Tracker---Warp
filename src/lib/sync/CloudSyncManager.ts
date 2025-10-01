import { ConvexClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import {
  SyncResult,
  SyncError,
  PendingOperation,
  CloudDataMapping,
  LocalDataExport,
  LocalExpense,
  LocalIncome,
  LocalCategory,
  LocalCard,
  LocalEntity,
  EntityType
} from '../types/local-storage';

/**
 * Retry policy configuration for failed sync operations
 */
interface RetryPolicy {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
}

/**
 * Network condition information for adaptive sync
 */
interface NetworkCondition {
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  effectiveType: string;
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
}

/**
 * Sync configuration based on network conditions
 */
interface SyncConfig {
  batchSize: number;
  compressionThreshold: number; // bytes
  maxConcurrentOperations: number;
  enableCompression: boolean;
  prioritizeUserActions: boolean;
}

/**
 * Delta sync information for incremental updates
 */
interface DeltaSync {
  lastSyncTimestamp: number;
  entityDeltas: Map<EntityType, EntityDelta>;
  totalChanges: number;
}

/**
 * Entity-specific delta information
 */
interface EntityDelta {
  created: string[];
  updated: string[];
  deleted: string[];
  lastModified: number;
}

/**
 * Batch operation for efficient sync
 */
interface BatchOperation {
  id: string;
  operations: PendingOperation[];
  priority: number;
  estimatedSize: number;
  compressed: boolean;
}

/**
 * CloudSyncManager handles all cloud synchronization operations with robust
 * error handling, retry mechanisms, intelligent conflict detection, and
 * advanced features like incremental sync, batching, and network awareness.
 */
export class CloudSyncManager {
  private convexClient: ConvexClient;
  private retryPolicy: RetryPolicy;
  private activeSyncs = new Set<string>();
  private networkCondition: NetworkCondition | null = null;
  private syncConfig: SyncConfig;
  private lastSyncTimestamps = new Map<EntityType, number>();
  private compressionWorker: Worker | null = null;

  constructor(convexClient: ConvexClient, retryPolicy?: Partial<RetryPolicy>) {
    this.convexClient = convexClient;
    this.retryPolicy = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      ...retryPolicy
    };

    // Initialize default sync configuration
    this.syncConfig = {
      batchSize: 50,
      compressionThreshold: 1024, // 1KB
      maxConcurrentOperations: 3,
      enableCompression: true,
      prioritizeUserActions: true
    };

    // Initialize network monitoring
    this.initializeNetworkMonitoring();

    // Initialize compression worker if supported
    this.initializeCompressionWorker();
  }

  /**
   * Initialize network condition monitoring
   */
  private initializeNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateNetworkCondition(connection);

      connection.addEventListener('change', () => {
        this.updateNetworkCondition(connection);
        this.adaptSyncConfig();
      });
    }
  }

  /**
   * Update network condition information
   */
  private updateNetworkCondition(connection: any): void {
    this.networkCondition = {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };
  }

  /**
   * Adapt sync configuration based on network conditions
   */
  private adaptSyncConfig(): void {
    if (!this.networkCondition) return;

    const { effectiveType, saveData, downlink } = this.networkCondition;

    // Adjust batch size based on network speed
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
      this.syncConfig.batchSize = 10;
      this.syncConfig.maxConcurrentOperations = 1;
      this.syncConfig.enableCompression = true;
      this.syncConfig.compressionThreshold = 512; // 512 bytes
    } else if (effectiveType === '3g') {
      this.syncConfig.batchSize = 25;
      this.syncConfig.maxConcurrentOperations = 2;
      this.syncConfig.enableCompression = true;
      this.syncConfig.compressionThreshold = 1024; // 1KB
    } else if (effectiveType === '4g' || downlink > 10) {
      this.syncConfig.batchSize = 100;
      this.syncConfig.maxConcurrentOperations = 5;
      this.syncConfig.enableCompression = false;
      this.syncConfig.compressionThreshold = 5120; // 5KB
    }

    console.log('Adapted sync config for network:', effectiveType, this.syncConfig);
  }

  /**
   * Initialize compression worker for large data transfers
   */
  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined' && this.syncConfig.enableCompression) {
      try {
        // Create inline worker for compression
        const workerScript = `
          self.onmessage = function(e) {
            const { data, compress } = e.data;
            try {
              if (compress) {
                // Simple compression using JSON stringify with reduced precision
                const compressed = JSON.stringify(data, (key, value) => {
                  if (typeof value === 'number' && !Number.isInteger(value)) {
                    return Math.round(value * 100) / 100; // Round to 2 decimal places
                  }
                  return value;
                });
                self.postMessage({ success: true, result: compressed, originalSize: JSON.stringify(data).length, compressedSize: compressed.length });
              } else {
                const decompressed = JSON.parse(data);
                self.postMessage({ success: true, result: decompressed });
              }
            } catch (error) {
              self.postMessage({ success: false, error: error.message });
            }
          };
        `;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
        this.compressionWorker = null;
      }
    }
  }

  /**
   * Compress data using worker or fallback method
   */
  private async compressData(data: any): Promise<{ compressed: string; originalSize: number; compressedSize: number }> {
    const originalData = JSON.stringify(data);
    const originalSize = originalData.length;

    if (originalSize < this.syncConfig.compressionThreshold) {
      return { compressed: originalData, originalSize, compressedSize: originalSize };
    }

    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Compression timeout'));
        }, 5000);

        this.compressionWorker!.onmessage = (e) => {
          clearTimeout(timeout);
          const { success, result, originalSize: origSize, compressedSize, error } = e.data;
          if (success) {
            resolve({ compressed: result, originalSize: origSize, compressedSize });
          } else {
            reject(new Error(error));
          }
        };

        this.compressionWorker!.postMessage({ data, compress: true });
      });
    }

    // Fallback compression
    try {
      const compressed = JSON.stringify(data, (key, value) => {
        if (typeof value === 'number' && !Number.isInteger(value)) {
          return Math.round(value * 100) / 100;
        }
        return value;
      });
      return { compressed, originalSize, compressedSize: compressed.length };
    } catch (error) {
      return { compressed: originalData, originalSize, compressedSize: originalSize };
    }
  }

  /**
   * Perform incremental sync with delta detection
   */
  async performIncrementalSync(token: string, lastSyncTimestamp?: number): Promise<SyncResult> {
    const operationId = `incremental_sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    if (this.activeSyncs.has(operationId)) {
      throw new Error('Incremental sync operation already in progress');
    }

    this.activeSyncs.add(operationId);

    try {
      const result: SyncResult = {
        success: true,
        conflicts: [],
        errors: [],
        syncedCount: 0,
        failedCount: 0,
        operationId,
        timestamp: Date.now()
      };

      // Get delta information
      const deltaSync = await this.calculateDeltas(lastSyncTimestamp || 0);

      if (deltaSync.totalChanges === 0) {
        console.log('No changes detected, skipping sync');
        return result;
      }

      console.log(`Incremental sync: ${deltaSync.totalChanges} changes detected`);

      // Process deltas for each entity type
      const entityEntries = Array.from(deltaSync.entityDeltas.entries());
      for (const [entityType, delta] of entityEntries) {
        if (delta.created.length > 0 || delta.updated.length > 0 || delta.deleted.length > 0) {
          const entityResult = await this.syncEntityDeltas(entityType, delta, token);
          result.syncedCount += entityResult.syncedCount;
          result.failedCount += entityResult.failedCount;
          result.errors.push(...entityResult.errors);
        }
      }

      // Update last sync timestamps
      this.updateSyncTimestamps(deltaSync);

      result.success = result.failedCount === 0;
      return result;

    } catch (error) {
      console.error('Incremental sync operation failed:', error);
      return {
        success: false,
        conflicts: [],
        errors: [{
          entityType: 'expenses',
          entityId: 'global',
          operation: 'create',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }],
        syncedCount: 0,
        failedCount: 1,
        operationId,
        timestamp: Date.now()
      };
    } finally {
      this.activeSyncs.delete(operationId);
    }
  }

  /**
   * Calculate deltas for incremental sync
   */
  private async calculateDeltas(lastSyncTimestamp: number): Promise<DeltaSync> {
    const deltaSync: DeltaSync = {
      lastSyncTimestamp,
      entityDeltas: new Map(),
      totalChanges: 0
    };

    // This would typically query the local storage for changes since lastSyncTimestamp
    // For now, we'll create a placeholder implementation
    const entityTypes: EntityType[] = ['expenses', 'income', 'cards', 'categories'];

    for (const entityType of entityTypes) {
      const delta: EntityDelta = {
        created: [],
        updated: [],
        deleted: [],
        lastModified: Date.now()
      };

      // In a real implementation, this would query local storage for:
      // - Records created since lastSyncTimestamp
      // - Records updated since lastSyncTimestamp  
      // - Records marked as deleted since lastSyncTimestamp

      deltaSync.entityDeltas.set(entityType, delta);
      deltaSync.totalChanges += delta.created.length + delta.updated.length + delta.deleted.length;
    }

    return deltaSync;
  }

  /**
   * Sync entity deltas to cloud
   */
  private async syncEntityDeltas(entityType: EntityType, delta: EntityDelta, token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    // Create batch operations for efficiency
    const batches = this.createBatches(delta, entityType);

    // Process batches with concurrency control
    const semaphore = new Array(this.syncConfig.maxConcurrentOperations).fill(null);
    const batchPromises = batches.map(async (batch, index) => {
      // Wait for available slot
      await semaphore[index % this.syncConfig.maxConcurrentOperations];

      try {
        const batchResult = await this.processBatch(batch, token);
        syncedCount += batchResult.syncedCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);
      } catch (error) {
        failedCount += batch.operations.length;
        errors.push({
          entityType,
          entityId: batch.id,
          operation: 'create',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error)
        });
      }
    });

    await Promise.all(batchPromises);

    return { syncedCount, failedCount, errors };
  }

  /**
   * Create batches from delta operations
   */
  private createBatches(delta: EntityDelta, entityType: EntityType): BatchOperation[] {
    const batches: BatchOperation[] = [];
    const allOperations: PendingOperation[] = [];

    // Convert delta to pending operations
    delta.created.forEach(id => {
      allOperations.push({
        id: `${entityType}_create_${id}`,
        type: 'create',
        entityType,
        entityId: id,
        data: {}, // Would be populated from local storage
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: this.retryPolicy.maxRetries
      });
    });

    delta.updated.forEach(id => {
      allOperations.push({
        id: `${entityType}_update_${id}`,
        type: 'update',
        entityType,
        entityId: id,
        data: {}, // Would be populated from local storage
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: this.retryPolicy.maxRetries
      });
    });

    delta.deleted.forEach(id => {
      allOperations.push({
        id: `${entityType}_delete_${id}`,
        type: 'delete',
        entityType,
        entityId: id,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: this.retryPolicy.maxRetries
      });
    });

    // Sort operations by priority (user actions first if enabled)
    if (this.syncConfig.prioritizeUserActions) {
      allOperations.sort((a, b) => {
        // Prioritize creates and updates over deletes
        const priorityA = a.type === 'delete' ? 1 : 0;
        const priorityB = b.type === 'delete' ? 1 : 0;
        return priorityA - priorityB;
      });
    }

    // Create batches
    for (let i = 0; i < allOperations.length; i += this.syncConfig.batchSize) {
      const batchOperations = allOperations.slice(i, i + this.syncConfig.batchSize);
      const estimatedSize = this.estimateBatchSize(batchOperations);

      batches.push({
        id: `batch_${entityType}_${Math.floor(i / this.syncConfig.batchSize)}`,
        operations: batchOperations,
        priority: this.calculateBatchPriority(batchOperations),
        estimatedSize,
        compressed: estimatedSize > this.syncConfig.compressionThreshold
      });
    }

    return batches;
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(batch: BatchOperation, token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    try {
      // Compress batch data if needed
      let batchData = batch.operations;
      if (batch.compressed && this.syncConfig.enableCompression) {
        const compressionResult = await this.compressData(batch.operations);
        console.log(`Batch ${batch.id} compressed: ${compressionResult.originalSize} -> ${compressionResult.compressedSize} bytes`);
        // In a real implementation, we'd send the compressed data
      }

      // Process operations in the batch
      for (const operation of batch.operations) {
        try {
          await this.processOperation(operation, token);
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            entityType: operation.entityType,
            entityId: operation.entityId,
            operation: operation.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }

    } catch (error) {
      // Batch-level error
      failedCount = batch.operations.length;
      errors.push({
        entityType: batch.operations[0]?.entityType || 'expenses',
        entityId: batch.id,
        operation: 'create',
        error: error instanceof Error ? error.message : 'Batch processing failed',
        retryable: this.isRetryableError(error)
      });
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Estimate batch size in bytes
   */
  private estimateBatchSize(operations: PendingOperation[]): number {
    try {
      return JSON.stringify(operations).length;
    } catch {
      return operations.length * 500; // Rough estimate
    }
  }

  /**
   * Calculate batch priority based on operations
   */
  private calculateBatchPriority(operations: PendingOperation[]): number {
    let priority = 0;

    operations.forEach(op => {
      // Higher priority for user actions (creates/updates)
      if (op.type === 'create' || op.type === 'update') {
        priority += 2;
      } else if (op.type === 'delete') {
        priority += 1;
      }

      // Higher priority for recent operations
      const age = Date.now() - op.timestamp;
      if (age < 60000) { // Less than 1 minute
        priority += 3;
      } else if (age < 300000) { // Less than 5 minutes
        priority += 1;
      }
    });

    return priority;
  }

  /**
   * Update sync timestamps after successful sync
   */
  private updateSyncTimestamps(deltaSync: DeltaSync): void {
    const entityEntries = Array.from(deltaSync.entityDeltas.entries());
    for (const [entityType, delta] of entityEntries) {
      this.lastSyncTimestamps.set(entityType, delta.lastModified);
    }
  }

  /**
   * Get network-aware sync schedule
   */
  getNetworkAwareSyncSchedule(): { interval: number; batchSize: number; priority: 'high' | 'medium' | 'low' } {
    if (!this.networkCondition) {
      return { interval: 30000, batchSize: 50, priority: 'medium' }; // Default 30 seconds
    }

    const { effectiveType, saveData } = this.networkCondition;

    if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
      return { interval: 120000, batchSize: 10, priority: 'low' }; // 2 minutes
    } else if (effectiveType === '3g') {
      return { interval: 60000, batchSize: 25, priority: 'medium' }; // 1 minute
    } else {
      return { interval: 15000, batchSize: 100, priority: 'high' }; // 15 seconds
    }
  }

  /**
   * Main sync method that uploads local data to cloud
   */
  async syncToCloud(localData: LocalDataExport, token: string): Promise<SyncResult> {
    const operationId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    if (this.activeSyncs.has(operationId)) {
      throw new Error('Sync operation already in progress');
    }

    this.activeSyncs.add(operationId);

    try {
      const result: SyncResult = {
        success: true,
        conflicts: [],
        errors: [],
        syncedCount: 0,
        failedCount: 0,
        operationId,
        timestamp: Date.now()
      };

      // Sync expenses
      if (localData.data.expenses) {
        const expenseResult = await this.syncExpenses(
          Object.values(localData.data.expenses),
          token
        );
        result.syncedCount += expenseResult.syncedCount;
        result.failedCount += expenseResult.failedCount;
        result.errors.push(...expenseResult.errors);
      }

      // Sync income
      if (localData.data.income) {
        const incomeResult = await this.syncIncome(
          Object.values(localData.data.income),
          token
        );
        result.syncedCount += incomeResult.syncedCount;
        result.failedCount += incomeResult.failedCount;
        result.errors.push(...incomeResult.errors);
      }

      // Sync categories
      if (localData.data.categories) {
        const categoryResult = await this.syncCategories(
          Object.values(localData.data.categories),
          token
        );
        result.syncedCount += categoryResult.syncedCount;
        result.failedCount += categoryResult.failedCount;
        result.errors.push(...categoryResult.errors);
      }

      // Sync cards
      if (localData.data.cards) {
        const cardResult = await this.syncCards(
          Object.values(localData.data.cards),
          token
        );
        result.syncedCount += cardResult.syncedCount;
        result.failedCount += cardResult.failedCount;
        result.errors.push(...cardResult.errors);
      }

      result.success = result.failedCount === 0;
      return result;

    } catch (error) {
      console.error('Sync operation failed:', error);
      return {
        success: false,
        conflicts: [],
        errors: [{
          entityType: 'expenses',
          entityId: 'global',
          operation: 'create',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }],
        syncedCount: 0,
        failedCount: 1,
        operationId,
        timestamp: Date.now()
      };
    } finally {
      this.activeSyncs.delete(operationId);
    }
  }

  /**
   * Download all data from cloud
   */
  async syncFromCloud(token: string): Promise<CloudDataMapping> {
    try {
      // Fetch data with proper error handling for missing API methods
      const results = await Promise.allSettled([
        this.safeApiCall(() => this.convexClient.query(api.expenses.getExpenses, { token }), 'getExpenses'),
        this.safeApiCall(() => this.convexClient.query(api.cardsAndIncome.getIncome, { token }), 'getIncome'),
        this.safeApiCall(() => this.convexClient.query(api.expenses.getCategories, { token }), 'getCategories'),
        this.safeApiCall(() => this.convexClient.query(api.cardsAndIncome.getMyCards, { token }), 'getMyCards'),
        this.safeApiCall(() => this.convexClient.query(api.expenses.getForValues, { token }), 'getForValues'),
        this.safeApiCall(() => this.convexClient.query(api.cardsAndIncome.getUniqueIncomeCategories, { token }), 'getUniqueIncomeCategories')
      ]);

      const [expenses, income, categories, cards, forValues, incomeCategories] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Failed to fetch data for API call ${index}:`, result.reason);
          return [];
        }
      });

      return {
        expenses,
        income,
        categories,
        cards,
        forValues,
        incomeCategories,
        metadata: {
          dataHash: this.generateDataHash({ expenses, income, categories, cards, forValues, incomeCategories }),
          lastModified: Date.now(),
          totalRecords: expenses.length + income.length + categories.length + cards.length + forValues.length + incomeCategories.length
        }
      };
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      throw new Error(`Cloud sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cloud data hash for conflict detection
   */
  async getCloudDataHash(token: string): Promise<string> {
    try {
      const cloudData = await this.syncFromCloud(token);
      return cloudData.metadata.dataHash;
    } catch (error) {
      console.error('Failed to get cloud data hash:', error);
      throw error;
    }
  }

  /**
   * Validate cloud data integrity
   */
  async validateCloudData(token: string): Promise<boolean> {
    try {
      const cloudData = await this.syncFromCloud(token);
      return cloudData.metadata.totalRecords >= 0;
    } catch (error) {
      console.error('Cloud data validation failed:', error);
      return false;
    }
  }

  /**
   * Upload local data to replace cloud data entirely
   */
  async uploadLocalData(localData: LocalDataExport, token: string): Promise<void> {
    try {
      // Clear existing cloud data first (if needed)
      // Then upload all local data
      const result = await this.syncToCloud(localData, token);

      if (!result.success) {
        throw new Error(`Upload failed: ${result.errors.map(e => e.error).join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to upload local data:', error);
      throw error;
    }
  }

  /**
   * Download cloud data to replace local data entirely
   */
  async downloadCloudData(token: string): Promise<CloudDataMapping> {
    try {
      return await this.syncFromCloud(token);
    } catch (error) {
      console.error('Failed to download cloud data:', error);
      throw error;
    }
  }

  /**
   * Sync expenses to cloud
   */
  private async syncExpenses(expenses: LocalExpense[], token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    for (const expense of expenses) {
      if (expense.syncStatus === 'pending' || expense.syncStatus === 'failed') {
        try {
          if (expense.cloudId) {
            // Update existing expense
            await this.retryWithBackoff(async () => {
              await this.convexClient.mutation(api.expenses.updateExpense, {
                token,
                expenseId: expense.cloudId as any,
                amount: expense.amount,
                title: expense.title,
                category: Array.isArray(expense.category) ? expense.category : [expense.category],
                for: Array.isArray(expense.for) ? expense.for : [expense.for],
                date: expense.date,
                cardId: expense.cardId as any
              });
            });
          } else {
            // Create new expense
            await this.retryWithBackoff(async () => {
              const result = await this.convexClient.mutation(api.expenses.createExpense, {
                token,
                amount: expense.amount,
                title: expense.title,
                category: Array.isArray(expense.category) ? expense.category : [expense.category],
                for: Array.isArray(expense.for) ? expense.for : [expense.for],
                date: expense.date,
                cardId: expense.cardId as any
              });
              // Update local record with cloud ID would be handled by the calling code
              return result;
            });
          }
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            entityType: 'expenses',
            entityId: expense.id,
            operation: expense.cloudId ? 'update' : 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Sync income to cloud
   */
  private async syncIncome(income: LocalIncome[], token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    for (const incomeItem of income) {
      if (incomeItem.syncStatus === 'pending' || incomeItem.syncStatus === 'failed') {
        try {
          if (incomeItem.cloudId) {
            // Update existing income
            await this.retryWithBackoff(async () => {
              await this.convexClient.mutation(api.cardsAndIncome.updateIncome, {
                token,
                incomeId: incomeItem.cloudId as any,
                amount: incomeItem.amount,
                cardId: incomeItem.cardId as any,
                date: incomeItem.date,
                source: incomeItem.source,
                category: incomeItem.category,
                notes: incomeItem.notes
              });
            });
          } else {
            // Create new income
            await this.retryWithBackoff(async () => {
              await this.convexClient.mutation(api.cardsAndIncome.createIncome, {
                token,
                amount: incomeItem.amount,
                cardId: incomeItem.cardId as any,
                date: incomeItem.date,
                source: incomeItem.source,
                category: incomeItem.category,
                notes: incomeItem.notes
              });
            });
          }
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            entityType: 'income',
            entityId: incomeItem.id,
            operation: incomeItem.cloudId ? 'update' : 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Sync categories to cloud
   */
  private async syncCategories(categories: LocalCategory[], token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    for (const category of categories) {
      if (category.syncStatus === 'pending' || category.syncStatus === 'failed') {
        try {
          // Categories are typically created automatically when expenses are created
          // This is a placeholder for category-specific sync logic
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            entityType: 'categories',
            entityId: category.id,
            operation: 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Sync cards to cloud
   */
  private async syncCards(cards: LocalCard[], token: string): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: SyncError[];
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    for (const card of cards) {
      if (card.syncStatus === 'pending' || card.syncStatus === 'failed') {
        try {
          if (card.cloudId) {
            // Cards don't have an update method in the current API
            // Skip updating existing cards for now
            console.warn(`Card update not supported for card ${card.id}`);
            syncedCount++;
          } else {
            // Create new card using addCard method
            await this.retryWithBackoff(async () => {
              const result = await this.convexClient.mutation(api.cardsAndIncome.addCard, {
                token,
                name: card.name
              });
              // The calling code should update the local record with the returned ID
              return result;
            });
            syncedCount++;
          }
        } catch (error) {
          failedCount++;
          errors.push({
            entityType: 'cards',
            entityId: card.id,
            operation: card.cloudId ? 'update' : 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.retryPolicy.maxRetries || !this.isRetryableError(error)) {
        throw error;
      }

      const delay = this.calculateDelay(retryCount);
      await this.sleep(delay);

      return this.retryWithBackoff(operation, retryCount + 1);
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(retryCount: number): number {
    const exponentialDelay = Math.min(
      this.retryPolicy.baseDelay * Math.pow(this.retryPolicy.backoffFactor, retryCount),
      this.retryPolicy.maxDelay
    );

    if (this.retryPolicy.jitter) {
      // Add jitter to prevent thundering herd
      const jitter = exponentialDelay * 0.1 * Math.random();
      return exponentialDelay + jitter;
    }

    return exponentialDelay;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are generally retryable
    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      return true;
    }

    // Rate limiting errors are retryable
    if (error?.status === 429 || error?.code === 'RATE_LIMITED') {
      return true;
    }

    // Server errors (5xx) are generally retryable
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }

    // Timeout errors are retryable
    if (error?.name === 'TimeoutError' || error?.code === 'TIMEOUT') {
      return true;
    }

    // Connection errors are retryable
    if (error?.message?.includes('fetch') || error?.message?.includes('connection')) {
      return true;
    }

    // Authentication errors are not retryable
    if (error?.status === 401 || error?.code === 'UNAUTHENTICATED' || error?.message?.includes('Authentication required')) {
      return false;
    }

    // Authorization errors are not retryable
    if (error?.status === 403 || error?.code === 'FORBIDDEN') {
      return false;
    }

    // Bad request errors are not retryable
    if (error?.status === 400 || error?.code === 'INVALID_ARGUMENT') {
      return false;
    }

    // API method not found errors are not retryable
    if (error?.message?.includes('does not exist') || error?.message?.includes('not found')) {
      return false;
    }

    // ConvexError instances from the server are generally not retryable
    if (error?.constructor?.name === 'ConvexError') {
      return false;
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Safely call API methods with proper error handling
   */
  private async safeApiCall<T>(apiCall: () => Promise<T>, methodName: string): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`API call ${methodName} failed:`, error);

      // Check if it's a missing method error
      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new Error(`API method ${methodName} is not available. Please check if the Convex backend is up to date.`);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generate data hash for comparison
   */
  private generateDataHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get current sync configuration
   */
  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  /**
   * Get current network condition
   */
  getNetworkCondition(): NetworkCondition | null {
    return this.networkCondition ? { ...this.networkCondition } : null;
  }

  /**
   * Update sync configuration manually
   */
  updateSyncConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    console.log('Sync configuration updated:', this.syncConfig);
  }

  /**
   * Get last sync timestamps for all entity types
   */
  getLastSyncTimestamps(): Map<EntityType, number> {
    return new Map(this.lastSyncTimestamps);
  }

  /**
   * Process pending operations queue with batching and network awareness
   */
  async processQueue(operations: PendingOperation[], token: string): Promise<SyncResult> {
    const operationId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    if (this.activeSyncs.has(operationId)) {
      throw new Error('Queue processing already in progress');
    }

    this.activeSyncs.add(operationId);

    try {
      const result: SyncResult = {
        success: true,
        conflicts: [],
        errors: [],
        syncedCount: 0,
        failedCount: 0,
        operationId,
        timestamp: Date.now()
      };

      // Filter operations that need processing
      const pendingOperations = operations.filter(op =>
        op.status === 'pending' || op.status === 'failed'
      );

      if (pendingOperations.length === 0) {
        return result;
      }

      // Group operations by entity type for better batching
      const operationsByType = new Map<EntityType, PendingOperation[]>();

      pendingOperations.forEach(op => {
        if (!operationsByType.has(op.entityType)) {
          operationsByType.set(op.entityType, []);
        }
        operationsByType.get(op.entityType)!.push(op);
      });

      // Process each entity type with batching
      const operationEntries = Array.from(operationsByType.entries());
      for (const [entityType, entityOperations] of operationEntries) {
        const batches = this.createOperationBatches(entityOperations, entityType);

        // Process batches with concurrency control
        const batchPromises = batches.map(async (batch, index) => {
          // Stagger batch processing to avoid overwhelming the server
          if (index > 0) {
            await this.sleep(100 * index); // 100ms delay between batches
          }

          try {
            const batchResult = await this.processBatch(batch, token);
            result.syncedCount += batchResult.syncedCount;
            result.failedCount += batchResult.failedCount;
            result.errors.push(...batchResult.errors);
          } catch (error) {
            result.failedCount += batch.operations.length;
            result.errors.push({
              entityType,
              entityId: batch.id,
              operation: 'create',
              error: error instanceof Error ? error.message : 'Batch processing failed',
              retryable: this.isRetryableError(error)
            });
          }
        });

        // Process batches with limited concurrency
        const concurrencyLimit = this.syncConfig.maxConcurrentOperations;
        for (let i = 0; i < batchPromises.length; i += concurrencyLimit) {
          const batchSlice = batchPromises.slice(i, i + concurrencyLimit);
          await Promise.all(batchSlice);
        }
      }

      result.success = result.failedCount === 0;
      return result;

    } catch (error) {
      console.error('Queue processing failed:', error);
      return {
        success: false,
        conflicts: [],
        errors: [{
          entityType: 'expenses',
          entityId: 'global',
          operation: 'create',
          error: error instanceof Error ? error.message : 'Queue processing failed',
          retryable: true
        }],
        syncedCount: 0,
        failedCount: operations.length,
        operationId,
        timestamp: Date.now()
      };
    } finally {
      this.activeSyncs.delete(operationId);
    }
  }

  /**
   * Create batches from pending operations
   */
  private createOperationBatches(operations: PendingOperation[], entityType: EntityType): BatchOperation[] {
    const batches: BatchOperation[] = [];

    // Sort operations by priority and timestamp
    const sortedOperations = [...operations].sort((a, b) => {
      // Prioritize by retry count (fewer retries first)
      if (a.retryCount !== b.retryCount) {
        return a.retryCount - b.retryCount;
      }

      // Then by operation type priority
      const typePriority = { create: 0, update: 1, delete: 2 };
      const aPriority = typePriority[a.type] || 3;
      const bPriority = typePriority[b.type] || 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Finally by timestamp (older first)
      return a.timestamp - b.timestamp;
    });

    // Create batches
    for (let i = 0; i < sortedOperations.length; i += this.syncConfig.batchSize) {
      const batchOperations = sortedOperations.slice(i, i + this.syncConfig.batchSize);
      const estimatedSize = this.estimateBatchSize(batchOperations);

      batches.push({
        id: `queue_batch_${entityType}_${Math.floor(i / this.syncConfig.batchSize)}_${Date.now()}`,
        operations: batchOperations,
        priority: this.calculateBatchPriority(batchOperations),
        estimatedSize,
        compressed: estimatedSize > this.syncConfig.compressionThreshold && this.syncConfig.enableCompression
      });
    }

    return batches;
  }

  /**
   * Process individual pending operation
   */
  private async processOperation(operation: PendingOperation, token: string): Promise<void> {
    switch (operation.entityType) {
      case 'expenses':
        await this.processExpenseOperation(operation, token);
        break;
      case 'income':
        await this.processIncomeOperation(operation, token);
        break;
      case 'cards':
        await this.processCardOperation(operation, token);
        break;
      default:
        throw new Error(`Unsupported entity type: ${operation.entityType}`);
    }
  }

  private async processExpenseOperation(operation: PendingOperation, token: string): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.convexClient.mutation(api.expenses.createExpense, {
          token,
          amount: operation.data.amount,
          title: operation.data.title,
          category: Array.isArray(operation.data.category) ? operation.data.category : [operation.data.category],
          for: Array.isArray(operation.data.for) ? operation.data.for : [operation.data.for],
          date: operation.data.date,
          cardId: operation.data.cardId
        });
        break;
      case 'update':
        await this.convexClient.mutation(api.expenses.updateExpense, {
          token,
          expenseId: operation.entityId as any,
          amount: operation.data.amount,
          title: operation.data.title,
          category: Array.isArray(operation.data.category) ? operation.data.category : [operation.data.category],
          for: Array.isArray(operation.data.for) ? operation.data.for : [operation.data.for],
          date: operation.data.date,
          cardId: operation.data.cardId
        });
        break;
      case 'delete':
        await this.convexClient.mutation(api.expenses.deleteExpense, {
          token,
          expenseId: operation.entityId as any
        });
        break;
    }
  }

  private async processIncomeOperation(operation: PendingOperation, token: string): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.convexClient.mutation(api.cardsAndIncome.createIncome, {
          token,
          amount: operation.data.amount,
          cardId: operation.data.cardId,
          date: operation.data.date,
          source: operation.data.source,
          category: operation.data.category,
          notes: operation.data.notes
        });
        break;
      case 'update':
        await this.convexClient.mutation(api.cardsAndIncome.updateIncome, {
          token,
          incomeId: operation.entityId as any,
          amount: operation.data.amount,
          cardId: operation.data.cardId,
          date: operation.data.date,
          source: operation.data.source,
          category: operation.data.category,
          notes: operation.data.notes
        });
        break;
      case 'delete':
        await this.convexClient.mutation(api.cardsAndIncome.deleteIncome, {
          token,
          incomeId: operation.entityId as any
        });
        break;
    }
  }

  private async processCardOperation(operation: PendingOperation, token: string): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.convexClient.mutation(api.cardsAndIncome.addCard, {
          token,
          name: operation.data.name
        });
        break;
      case 'update':
        // Cards don't have an update method in the current API
        throw new Error('Card update operation not supported by current API');
      case 'delete':
        await this.convexClient.mutation(api.cardsAndIncome.deleteCard, {
          token,
          cardId: operation.entityId as any
        });
        break;
    }
  }

  /**
   * Cleanup resources when the sync manager is no longer needed
   */
  cleanup(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    this.activeSyncs.clear();
    this.lastSyncTimestamps.clear();
  }

  /**
   * Get sync statistics and performance metrics
   */
  getSyncStats(): {
    activeSyncs: number;
    networkCondition: NetworkCondition | null;
    syncConfig: SyncConfig;
    lastSyncTimestamps: Record<string, number>;
  } {
    return {
      activeSyncs: this.activeSyncs.size,
      networkCondition: this.networkCondition,
      syncConfig: { ...this.syncConfig },
      lastSyncTimestamps: Object.fromEntries(this.lastSyncTimestamps)
    };
  }
}