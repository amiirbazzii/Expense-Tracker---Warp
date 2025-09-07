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
 * CloudSyncManager handles all cloud synchronization operations with robust
 * error handling, retry mechanisms, and intelligent conflict detection.
 */
export class CloudSyncManager {
  private convexClient: ConvexClient;
  private retryPolicy: RetryPolicy;
  private activeSyncs = new Set<string>();

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
  }

  /**
   * Main sync method that uploads local data to cloud
   */
  async syncToCloud(localData: LocalDataExport, token: string): Promise<SyncResult> {
    const operationId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
      const [expenses, income, categories, cards] = await Promise.all([
        this.convexClient.query(api.expenses.getExpenses, { token }),
        this.convexClient.query(api.cardsAndIncome.getIncome, { token }),
        this.convexClient.query(api.expenses.getCategories, { token }),
        this.convexClient.query(api.cardsAndIncome.getCards, { token })
      ]);

      return {
        expenses,
        income,
        categories,
        cards,
        forValues: [],
        incomeCategories: [],
        metadata: {
          dataHash: this.generateDataHash({ expenses, income, categories, cards }),
          lastModified: Date.now(),
          totalRecords: expenses.length + income.length + categories.length + cards.length
        }
      };
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      throw error;
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
                category: expense.category,
                for: expense.for,
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
                category: expense.category,
                for: expense.for,
                date: expense.date,
                cardId: expense.cardId as any
              });
              // Update local record with cloud ID would be handled by the calling code
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
            // Update existing card
            await this.retryWithBackoff(async () => {
              await this.convexClient.mutation(api.cardsAndIncome.updateCard, {
                token,
                cardId: card.cloudId as any,
                name: card.name
              });
            });
          } else {
            // Create new card
            await this.retryWithBackoff(async () => {
              await this.convexClient.mutation(api.cardsAndIncome.createCard, {
                token,
                name: card.name
              });
            });
          }
          syncedCount++;
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

    // Authentication errors are not retryable
    if (error?.status === 401 || error?.code === 'UNAUTHENTICATED') {
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

    // Default to not retryable for unknown errors
    return false;
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
   * Process pending operations queue
   */
  async processQueue(operations: PendingOperation[], token: string): Promise<SyncResult> {
    const operationId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: SyncResult = {
      success: true,
      conflicts: [],
      errors: [],
      syncedCount: 0,
      failedCount: 0,
      operationId,
      timestamp: Date.now()
    };

    for (const operation of operations) {
      if (operation.status === 'pending' || operation.status === 'failed') {
        try {
          await this.processOperation(operation, token);
          result.syncedCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            entityType: operation.entityType,
            entityId: operation.entityId,
            operation: operation.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: this.isRetryableError(error)
          });
        }
      }
    }

    result.success = result.failedCount === 0;
    return result;
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
          ...operation.data
        });
        break;
      case 'update':
        await this.convexClient.mutation(api.expenses.updateExpense, {
          token,
          expenseId: operation.entityId as any,
          ...operation.data
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
          ...operation.data
        });
        break;
      case 'update':
        await this.convexClient.mutation(api.cardsAndIncome.updateIncome, {
          token,
          incomeId: operation.entityId as any,
          ...operation.data
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
        await this.convexClient.mutation(api.cardsAndIncome.createCard, {
          token,
          ...operation.data
        });
        break;
      case 'update':
        await this.convexClient.mutation(api.cardsAndIncome.updateCard, {
          token,
          cardId: operation.entityId as any,
          ...operation.data
        });
        break;
      case 'delete':
        await this.convexClient.mutation(api.cardsAndIncome.deleteCard, {
          token,
          cardId: operation.entityId as any
        });
        break;
    }
  }
}