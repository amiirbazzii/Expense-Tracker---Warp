import { ConvexClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { 
  LocalExpense, 
  LocalIncome, 
  LocalCategory, 
  LocalCard,
  PendingOperation,
  SyncResult,
  ConflictDetectionResult,
  DataFilters
} from '../types/local-storage';
import { LocalStorageManager } from '../storage/LocalStorageManager';
import { CloudSyncManager } from '../sync/CloudSyncManager';
import { ConflictDetector } from '../sync/ConflictDetector';

/**
 * LocalFirstConvexClient provides a seamless API wrapper that prioritizes
 * local storage operations while managing cloud synchronization in the background.
 * All operations complete immediately with local data, then sync to cloud when online.
 */
export class LocalFirstConvexClient {
  private localStorageManager: LocalStorageManager;
  private cloudSyncManager: CloudSyncManager;
  private conflictDetector: ConflictDetector;
  private convexClient: ConvexClient;
  private userId?: string;

  // Event listeners for sync status changes
  private onSyncStatusChange?: (status: 'idle' | 'syncing' | 'error' | 'conflict') => void;
  private onConflictDetected?: (result: ConflictDetectionResult) => void;

  constructor(convexClient: ConvexClient) {
    this.convexClient = convexClient;
    this.localStorageManager = new LocalStorageManager();
    this.cloudSyncManager = new CloudSyncManager(convexClient);
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * Initialize the client with user authentication
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.localStorageManager.initialize(userId);
    
    // Start background conflict detection
    this.startBackgroundConflictDetection();
  }

  /**
   * Set event listeners
   */
  setEventListeners({
    onSyncStatusChange,
    onConflictDetected
  }: {
    onSyncStatusChange?: (status: 'idle' | 'syncing' | 'error' | 'conflict') => void;
    onConflictDetected?: (result: ConflictDetectionResult) => void;
  }) {
    this.onSyncStatusChange = onSyncStatusChange;
    this.onConflictDetected = onConflictDetected;
  }

  // EXPENSE OPERATIONS

  /**
   * Create expense with immediate local storage and background cloud sync
   */
  async createExpense(expenseData: {
    amount: number;
    title: string;
    category: string[];
    for: string[];
    date: number;
    cardId?: string;
  }): Promise<LocalExpense> {
    try {
      // 1. Save locally first for immediate response
      const localExpense = await this.localStorageManager.saveExpense(expenseData);
      
      // 2. Queue for cloud sync
      await this.queueOperation({
        id: `expense_create_${Date.now()}`,
        type: 'create',
        entityType: 'expenses',
        entityId: localExpense.id,
        data: expenseData,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: 3
      });
      
      // 3. Attempt immediate sync if online
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localExpense;
    } catch (error) {
      console.error('Failed to create expense:', error);
      throw error;
    }
  }

  /**
   * Get expenses from local storage with optional filters
   */
  async getExpenses(filters?: DataFilters): Promise<LocalExpense[]> {
    try {
      // Always return local data immediately
      const localExpenses = await this.localStorageManager.getExpenses(filters);
      
      // Background sync if online
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localExpenses;
    } catch (error) {
      console.error('Failed to get expenses:', error);
      throw error;
    }
  }

  /**
   * Update expense with immediate local storage and background cloud sync
   */
  async updateExpense(
    expenseId: string, 
    updates: Partial<LocalExpense>
  ): Promise<LocalExpense | null> {
    try {
      // 1. Update locally first
      const updatedExpense = await this.localStorageManager.updateExpense(expenseId, updates);
      
      if (updatedExpense) {
        // 2. Queue for cloud sync
        await this.queueOperation({
          id: `expense_update_${Date.now()}`,
          type: 'update',
          entityType: 'expenses',
          entityId: expenseId,
          data: updates,
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          maxRetries: 3
        });
        
        // 3. Attempt immediate sync if online
        if (navigator.onLine) {
          this.backgroundSync();
        }
      }
      
      return updatedExpense;
    } catch (error) {
      console.error('Failed to update expense:', error);
      throw error;
    }
  }

  /**
   * Delete expense with immediate local storage and background cloud sync
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      // 1. Delete locally first
      const success = await this.localStorageManager.deleteExpense(expenseId);
      
      if (success) {
        // 2. Queue for cloud sync
        await this.queueOperation({
          id: `expense_delete_${Date.now()}`,
          type: 'delete',
          entityType: 'expenses',
          entityId: expenseId,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          maxRetries: 3
        });
        
        // 3. Attempt immediate sync if online
        if (navigator.onLine) {
          this.backgroundSync();
        }
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete expense:', error);
      throw error;
    }
  }

  // INCOME OPERATIONS

  /**
   * Create income with immediate local storage and background cloud sync
   */
  async createIncome(incomeData: {
    amount: number;
    cardId: string;
    date: number;
    source: string;
    category: string;
    notes?: string;
  }): Promise<LocalIncome> {
    try {
      const localIncome = await this.localStorageManager.saveIncome(incomeData);
      
      await this.queueOperation({
        id: `income_create_${Date.now()}`,
        type: 'create',
        entityType: 'income',
        entityId: localIncome.id,
        data: incomeData,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: 3
      });
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localIncome;
    } catch (error) {
      console.error('Failed to create income:', error);
      throw error;
    }
  }

  /**
   * Get income from local storage
   */
  async getIncome(filters?: DataFilters): Promise<LocalIncome[]> {
    try {
      const localIncome = await this.localStorageManager.getIncome(filters);
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localIncome;
    } catch (error) {
      console.error('Failed to get income:', error);
      throw error;
    }
  }

  // CATEGORY OPERATIONS

  /**
   * Create category with immediate local storage and background cloud sync
   */
  async createCategory(categoryData: {
    name: string;
    type: 'expense' | 'income';
  }): Promise<LocalCategory> {
    try {
      const localCategory = await this.localStorageManager.saveCategory(categoryData);
      
      await this.queueOperation({
        id: `category_create_${Date.now()}`,
        type: 'create',
        entityType: 'categories',
        entityId: localCategory.id,
        data: categoryData,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: 3
      });
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localCategory;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Get categories from local storage
   */
  async getCategories(type?: 'expense' | 'income'): Promise<LocalCategory[]> {
    try {
      const localCategories = await this.localStorageManager.getCategories(type);
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localCategories;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  // CARD OPERATIONS

  /**
   * Create card with immediate local storage and background cloud sync
   */
  async createCard(cardData: { name: string }): Promise<LocalCard> {
    try {
      const localCard = await this.localStorageManager.saveCard(cardData);
      
      await this.queueOperation({
        id: `card_create_${Date.now()}`,
        type: 'create',
        entityType: 'cards',
        entityId: localCard.id,
        data: cardData,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        maxRetries: 3
      });
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localCard;
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }

  /**
   * Get cards from local storage
   */
  async getCards(): Promise<LocalCard[]> {
    try {
      const localCards = await this.localStorageManager.getCards();
      
      if (navigator.onLine) {
        this.backgroundSync();
      }
      
      return localCards;
    } catch (error) {
      console.error('Failed to get cards:', error);
      throw error;
    }
  }

  // SYNC OPERATIONS

  /**
   * Force synchronization with cloud
   */
  async forceSyncToCloud(token: string): Promise<SyncResult> {
    try {
      this.onSyncStatusChange?.('syncing');
      
      const localData = await this.localStorageManager.exportData();
      const result = await this.cloudSyncManager.syncToCloud(localData, token);
      
      if (result.conflicts.length > 0) {
        this.onSyncStatusChange?.('conflict');
      } else if (result.success) {
        this.onSyncStatusChange?.('idle');
        await this.clearCompletedOperations();
      } else {
        this.onSyncStatusChange?.('error');
      }
      
      return result;
    } catch (error) {
      console.error('Force sync failed:', error);
      this.onSyncStatusChange?.('error');
      throw error;
    }
  }

  /**
   * Download cloud data to replace local data
   */
  async downloadCloudData(token: string): Promise<void> {
    try {
      this.onSyncStatusChange?.('syncing');
      
      const cloudData = await this.cloudSyncManager.downloadCloudData(token);
      const convertedData = this.convertCloudDataToLocal(cloudData);
      
      await this.localStorageManager.importData(convertedData);
      
      this.onSyncStatusChange?.('idle');
    } catch (error) {
      console.error('Download cloud data failed:', error);
      this.onSyncStatusChange?.('error');
      throw error;
    }
  }

  /**
   * Upload local data to replace cloud data
   */
  async uploadLocalData(token: string): Promise<void> {
    try {
      this.onSyncStatusChange?.('syncing');
      
      const localData = await this.localStorageManager.exportData();
      await this.cloudSyncManager.uploadLocalData(localData, token);
      
      this.onSyncStatusChange?.('idle');
      await this.clearCompletedOperations();
    } catch (error) {
      console.error('Upload local data failed:', error);
      this.onSyncStatusChange?.('error');
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    pendingOperations: number;
    lastSync: Date | null;
    hasConflicts: boolean;
  }> {
    try {
      const pendingOps = await this.localStorageManager.getPendingOperations();
      const syncState = await this.localStorageManager.getSyncState();
      
      return {
        pendingOperations: pendingOps.filter(op => op.status === 'pending' || op.status === 'failed').length,
        lastSync: syncState?.lastSync ? new Date(syncState.lastSync) : null,
        hasConflicts: false // This would be determined by conflict detection
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        pendingOperations: 0,
        lastSync: null,
        hasConflicts: false
      };
    }
  }

  // PRIVATE METHODS

  /**
   * Queue an operation for background sync
   */
  private async queueOperation(operation: PendingOperation): Promise<void> {
    await this.localStorageManager.addPendingOperation(operation);
  }

  /**
   * Background sync process
   */
  private async backgroundSync(): Promise<void> {
    try {
      const pendingOps = await this.localStorageManager.getPendingOperations();
      const pendingOperations = pendingOps.filter(op => op.status === 'pending' || op.status === 'failed');
      
      if (pendingOperations.length === 0) return;
      
      // This would require a token, so we'll skip for now
      // In a real implementation, we'd get the token from auth context
      // const result = await this.cloudSyncManager.processQueue(pendingOperations, token);
      
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Start background conflict detection
   */
  private startBackgroundConflictDetection(): void {
    // Check for conflicts every 5 minutes when online
    setInterval(async () => {
      if (navigator.onLine && this.userId) {
        try {
          await this.checkForConflicts();
        } catch (error) {
          console.error('Background conflict detection failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Check for conflicts between local and cloud data
   */
  private async checkForConflicts(): Promise<void> {
    try {
      const localData = await this.localStorageManager.exportData();
      
      // This would require a token from auth context
      // const cloudData = await this.cloudSyncManager.syncFromCloud(token);
      // const conflictResult = await this.conflictDetector.detectConflicts(localData, cloudData);
      
      // if (conflictResult.hasConflicts) {
      //   this.onConflictDetected?.(conflictResult);
      // }
      
    } catch (error) {
      console.error('Conflict detection failed:', error);
    }
  }

  /**
   * Clear completed operations from the queue
   */
  private async clearCompletedOperations(): Promise<void> {
    const pendingOps = await this.localStorageManager.getPendingOperations();
    const completedOps = pendingOps.filter(op => op.status === 'completed');
    
    for (const op of completedOps) {
      await this.localStorageManager.removePendingOperation(op.id);
    }
  }

  /**
   * Convert cloud data format to local data format
   */
  private convertCloudDataToLocal(cloudData: any): any {
    // This is a simplified conversion
    // Real implementation would properly map all fields
    return {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: 'cloud_import',
      userId: this.userId || 'unknown',
      data: {
        expenses: this.convertCloudExpensesToLocal(cloudData.expenses || []),
        income: this.convertCloudIncomeToLocal(cloudData.income || []),
        categories: this.convertCloudCategoriesToLocal(cloudData.categories || []),
        cards: this.convertCloudCardsToLocal(cloudData.cards || []),
        syncState: {
          lastSync: Date.now(),
          pendingOperations: [],
          dataHash: '',
          conflictResolutions: [],
          totalRecords: 0,
          lastModified: Date.now()
        },
        metadata: {
          version: '2.0.0',
          deviceId: 'cloud_import',
          userId: this.userId || 'unknown',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          schemaVersion: 2
        }
      },
      checksum: ''
    };
  }

  private convertCloudExpensesToLocal(cloudExpenses: any[]): Record<string, LocalExpense> {
    const result: Record<string, LocalExpense> = {};
    
    for (const expense of cloudExpenses) {
      const localExpense: LocalExpense = {
        id: expense._id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cloudId: expense._id,
        syncStatus: 'synced',
        version: 1,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt || expense.createdAt,
        lastSyncedAt: Date.now(),
        amount: expense.amount,
        title: expense.title,
        category: expense.category,
        for: expense.for,
        date: expense.date,
        cardId: expense.cardId
      };
      
      result[expense._id] = localExpense;
    }
    
    return result;
  }

  private convertCloudIncomeToLocal(cloudIncome: any[]): Record<string, LocalIncome> {
    const result: Record<string, LocalIncome> = {};
    
    for (const income of cloudIncome) {
      const localIncome: LocalIncome = {
        id: income._id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cloudId: income._id,
        syncStatus: 'synced',
        version: 1,
        createdAt: income.createdAt,
        updatedAt: income.updatedAt || income.createdAt,
        lastSyncedAt: Date.now(),
        amount: income.amount,
        cardId: income.cardId,
        date: income.date,
        source: income.source,
        category: income.category,
        notes: income.notes
      };
      
      result[income._id] = localIncome;
    }
    
    return result;
  }

  private convertCloudCategoriesToLocal(cloudCategories: any[]): Record<string, LocalCategory> {
    const result: Record<string, LocalCategory> = {};
    
    for (const category of cloudCategories) {
      const localCategory: LocalCategory = {
        id: category._id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cloudId: category._id,
        syncStatus: 'synced',
        version: 1,
        createdAt: category.createdAt || Date.now(),
        updatedAt: category.updatedAt || Date.now(),
        lastSyncedAt: Date.now(),
        name: category.name,
        type: 'expense' // Default, would need better logic
      };
      
      result[category._id] = localCategory;
    }
    
    return result;
  }

  private convertCloudCardsToLocal(cloudCards: any[]): Record<string, LocalCard> {
    const result: Record<string, LocalCard> = {};
    
    for (const card of cloudCards) {
      const localCard: LocalCard = {
        id: card._id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cloudId: card._id,
        syncStatus: 'synced',
        version: 1,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt || card.createdAt,
        lastSyncedAt: Date.now(),
        name: card.name
      };
      
      result[card._id] = localCard;
    }
    
    return result;
  }
}