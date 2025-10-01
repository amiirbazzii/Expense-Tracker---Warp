import * as localforage from 'localforage';
import {
  LocalDataSchema,
  LocalExpense,
  LocalIncome,
  LocalCategory,
  LocalCard,
  LocalForValue,
  LocalEntity,
  DataFilters,
  EntityType,
  LocalDataExport,
  PendingOperation,
  SyncState,
  LocalMetadata
} from '../types/local-storage';

/**
 * LocalStorageManager provides a comprehensive interface for local data operations
 * using IndexedDB via localforage abstraction. Handles all CRUD operations,
 * data export/import, and storage management for the local-first architecture.
 */
export class LocalStorageManager {
  private storage: typeof localforage;
  private initialized = false;

  constructor() {
    this.storage = localforage.createInstance({
      name: 'ExpenseTrackerV2',
      storeName: 'local_first_data',
      description: 'Local-first data storage with cloud sync capabilities',
      version: 2.0
    });
  }

  /**
   * Initialize the storage manager and set up the database structure
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize metadata if it doesn't exist
      const metadata = await this.getMetadata();
      if (!metadata) {
        await this.initializeMetadata(userId);
      }

      // Initialize sync state if it doesn't exist
      const syncState = await this.getSyncState();
      if (!syncState) {
        await this.initializeSyncState();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LocalStorageManager:', error);
      throw error;
    }
  }

  private async initializeMetadata(userId: string): Promise<void> {
    const metadata: LocalMetadata = {
      version: '2.0.0',
      deviceId: this.generateDeviceId(),
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 2
    };

    await this.storage.setItem('metadata', metadata);
  }

  private async initializeSyncState(): Promise<void> {
    const syncState: SyncState = {
      lastSync: 0,
      pendingOperations: [],
      dataHash: '',
      conflictResolutions: [],
      totalRecords: 0,
      lastModified: Date.now()
    };

    await this.storage.setItem('syncState', syncState);
  }

  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Metadata operations
  async getMetadata(): Promise<LocalMetadata | null> {
    return await this.storage.getItem('metadata');
  }

  async updateMetadata(updates: Partial<LocalMetadata>): Promise<void> {
    const metadata = await this.getMetadata();
    if (metadata) {
      const updated = { ...metadata, ...updates, updatedAt: Date.now() };
      await this.storage.setItem('metadata', updated);
    }
  }

  // Sync state operations
  async getSyncState(): Promise<SyncState | null> {
    return await this.storage.getItem('syncState');
  }

  async updateSyncState(updates: Partial<SyncState>): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const updated = { ...syncState, ...updates };
      await this.storage.setItem('syncState', updated);
    }
  }

  // Generic entity operations
  private async getEntityCollection<T extends LocalEntity>(entityType: EntityType): Promise<{ [id: string]: T }> {
    const collection = await this.storage.getItem(entityType);
    return (collection as { [id: string]: T }) || {};
  }

  private async setEntityCollection<T extends LocalEntity>(entityType: EntityType, collection: { [id: string]: T }): Promise<void> {
    await this.storage.setItem(entityType, collection);
    await this.updateLastModified();
  }

  private async updateLastModified(): Promise<void> {
    await this.updateSyncState({ lastModified: Date.now() });
  }

  // Expense operations
  async saveExpense(expense: Omit<LocalExpense, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalExpense> {
    const collection = await this.getEntityCollection<LocalExpense>('expenses');

    const localExpense: LocalExpense = {
      ...expense,
      id: expense.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localExpense.id] = localExpense;
    await this.setEntityCollection('expenses', collection);

    return localExpense;
  }

  async getExpenses(filters?: DataFilters): Promise<LocalExpense[]> {
    const collection = await this.getEntityCollection<LocalExpense>('expenses');
    let expenses = Object.values(collection);

    if (filters) {
      expenses = this.applyFilters(expenses, filters);
    }

    return expenses.sort((a, b) => b.date - a.date);
  }

  async getExpenseById(id: string): Promise<LocalExpense | null> {
    const collection = await this.getEntityCollection<LocalExpense>('expenses');
    return collection[id] || null;
  }

  async updateExpense(id: string, updates: Partial<LocalExpense>): Promise<LocalExpense | null> {
    const collection = await this.getEntityCollection<LocalExpense>('expenses');
    const expense = collection[id];

    if (!expense) return null;

    const updated: LocalExpense = {
      ...expense,
      ...updates,
      version: expense.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('expenses', collection);

    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalExpense>('expenses');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('expenses', collection);

    return true;
  }

  // Income operations
  async saveIncome(income: Omit<LocalIncome, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalIncome> {
    const collection = await this.getEntityCollection<LocalIncome>('income');

    const localIncome: LocalIncome = {
      ...income,
      id: income.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localIncome.id] = localIncome;
    await this.setEntityCollection('income', collection);

    return localIncome;
  }

  async getIncome(filters?: DataFilters): Promise<LocalIncome[]> {
    const collection = await this.getEntityCollection<LocalIncome>('income');
    let income = Object.values(collection);

    if (filters) {
      income = this.applyFilters(income, filters);
    }

    return income.sort((a, b) => b.date - a.date);
  }

  async updateIncome(id: string, updates: Partial<LocalIncome>): Promise<LocalIncome | null> {
    const collection = await this.getEntityCollection<LocalIncome>('income');
    const income = collection[id];

    if (!income) return null;

    const updated: LocalIncome = {
      ...income,
      ...updates,
      version: income.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('income', collection);

    return updated;
  }

  async deleteIncome(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalIncome>('income');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('income', collection);

    return true;
  }

  // Category operations
  async saveCategory(category: Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalCategory> {
    const collection = await this.getEntityCollection<LocalCategory>('categories');

    const localCategory: LocalCategory = {
      ...category,
      id: category.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localCategory.id] = localCategory;
    await this.setEntityCollection('categories', collection);

    return localCategory;
  }

  async getCategories(type?: 'expense' | 'income'): Promise<LocalCategory[]> {
    const collection = await this.getEntityCollection<LocalCategory>('categories');
    let categories = Object.values(collection);

    if (type) {
      categories = categories.filter(cat => cat.type === type);
    }

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Card operations
  async saveCard(card: Omit<LocalCard, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalCard> {
    const collection = await this.getEntityCollection<LocalCard>('cards');

    const localCard: LocalCard = {
      ...card,
      id: card.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localCard.id] = localCard;
    await this.setEntityCollection('cards', collection);

    return localCard;
  }

  async getCards(): Promise<LocalCard[]> {
    const collection = await this.getEntityCollection<LocalCard>('cards');
    return Object.values(collection).sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateCard(id: string, updates: Partial<LocalCard>): Promise<LocalCard | null> {
    const collection = await this.getEntityCollection<LocalCard>('cards');
    const card = collection[id];

    if (!card) return null;

    const updated: LocalCard = {
      ...card,
      ...updates,
      version: card.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('cards', collection);

    return updated;
  }

  async deleteCard(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalCard>('cards');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('cards', collection);

    return true;
  }

  // For Values operations
  async saveForValue(forValue: Omit<LocalForValue, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalForValue> {
    const collection = await this.getEntityCollection<LocalForValue>('forValues');

    const localForValue: LocalForValue = {
      ...forValue,
      id: forValue.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localForValue.id] = localForValue;
    await this.setEntityCollection('forValues', collection);

    return localForValue;
  }

  async getForValues(): Promise<LocalForValue[]> {
    const collection = await this.getEntityCollection<LocalForValue>('forValues');
    return Object.values(collection).sort((a, b) => a.value.localeCompare(b.value));
  }

  async updateForValue(id: string, updates: Partial<LocalForValue>): Promise<LocalForValue | null> {
    const collection = await this.getEntityCollection<LocalForValue>('forValues');
    const forValue = collection[id];

    if (!forValue) return null;

    const updated: LocalForValue = {
      ...forValue,
      ...updates,
      version: forValue.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('forValues', collection);

    return updated;
  }

  async deleteForValue(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalForValue>('forValues');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('forValues', collection);

    return true;
  }

  // Income Categories operations (separate from regular categories)
  async saveIncomeCategory(category: Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>): Promise<LocalCategory> {
    const collection = await this.getEntityCollection<LocalCategory>('incomeCategories');

    const localCategory: LocalCategory = {
      ...category,
      type: 'income', // Ensure it's marked as income category
      id: category.cloudId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collection[localCategory.id] = localCategory;
    await this.setEntityCollection('incomeCategories', collection);

    return localCategory;
  }

  async getIncomeCategories(): Promise<LocalCategory[]> {
    const collection = await this.getEntityCollection<LocalCategory>('incomeCategories');
    return Object.values(collection).sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateIncomeCategory(id: string, updates: Partial<LocalCategory>): Promise<LocalCategory | null> {
    const collection = await this.getEntityCollection<LocalCategory>('incomeCategories');
    const category = collection[id];

    if (!category) return null;

    const updated: LocalCategory = {
      ...category,
      ...updates,
      type: 'income', // Ensure it remains an income category
      version: category.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('incomeCategories', collection);

    return updated;
  }

  async deleteIncomeCategory(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalCategory>('incomeCategories');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('incomeCategories', collection);

    return true;
  }

  // Enhanced category operations with update/delete
  async updateCategory(id: string, updates: Partial<LocalCategory>): Promise<LocalCategory | null> {
    const collection = await this.getEntityCollection<LocalCategory>('categories');
    const category = collection[id];

    if (!category) return null;

    const updated: LocalCategory = {
      ...category,
      ...updates,
      version: category.version + 1,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    };

    collection[id] = updated;
    await this.setEntityCollection('categories', collection);

    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const collection = await this.getEntityCollection<LocalCategory>('categories');

    if (!collection[id]) return false;

    delete collection[id];
    await this.setEntityCollection('categories', collection);

    return true;
  }

  // Data validation and corruption recovery
  async validateEntity<T extends LocalEntity>(entity: T, entityType: EntityType): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!entity.id) errors.push('Missing id');
    if (!entity.localId) errors.push('Missing localId');
    if (!entity.syncStatus) errors.push('Missing syncStatus');
    if (typeof entity.version !== 'number' || entity.version < 1) errors.push('Invalid version');
    if (!entity.createdAt || !entity.updatedAt) errors.push('Missing timestamps');

    // Entity-specific validation
    switch (entityType) {
      case 'expenses':
        const expense = entity as unknown as LocalExpense;
        if (typeof expense.amount !== 'number' || expense.amount <= 0) errors.push('Invalid amount');
        if (!expense.title?.trim()) errors.push('Missing title');
        if (!Array.isArray(expense.category)) errors.push('Invalid category format');
        if (!Array.isArray(expense.for)) errors.push('Invalid for format');
        if (!expense.date || expense.date <= 0) errors.push('Invalid date');
        break;

      case 'income':
        const income = entity as unknown as LocalIncome;
        if (typeof income.amount !== 'number' || income.amount <= 0) errors.push('Invalid amount');
        if (!income.cardId?.trim()) errors.push('Missing cardId');
        if (!income.source?.trim()) errors.push('Missing source');
        if (!income.category?.trim()) errors.push('Missing category');
        if (!income.date || income.date <= 0) errors.push('Invalid date');
        break;

      case 'categories':
      case 'incomeCategories':
        const category = entity as unknown as LocalCategory;
        if (!category.name?.trim()) errors.push('Missing name');
        if (!['expense', 'income'].includes(category.type)) errors.push('Invalid type');
        break;

      case 'cards':
        const card = entity as unknown as LocalCard;
        if (!card.name?.trim()) errors.push('Missing name');
        break;

      case 'forValues':
        const forValue = entity as unknown as LocalForValue;
        if (!forValue.value?.trim()) errors.push('Missing value');
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  async validateCollection<T extends LocalEntity>(entityType: EntityType): Promise<{ isValid: boolean; corruptedIds: string[]; errors: string[] }> {
    const collection = await this.getEntityCollection<T>(entityType);
    const corruptedIds: string[] = [];
    const allErrors: string[] = [];

    for (const [id, entity] of Object.entries(collection)) {
      const validation = await this.validateEntity(entity, entityType);
      if (!validation.isValid) {
        corruptedIds.push(id);
        allErrors.push(`Entity ${id}: ${validation.errors.join(', ')}`);
      }
    }

    return {
      isValid: corruptedIds.length === 0,
      corruptedIds,
      errors: allErrors
    };
  }

  async repairCorruptedData(entityType: EntityType, strategy: 'remove' | 'repair' = 'repair'): Promise<{ repairedCount: number; removedCount: number }> {
    const validation = await this.validateCollection(entityType);
    let repairedCount = 0;
    let removedCount = 0;

    if (!validation.isValid) {
      const collection = await this.getEntityCollection(entityType);

      for (const corruptedId of validation.corruptedIds) {
        const entity = collection[corruptedId];

        if (strategy === 'remove') {
          delete collection[corruptedId];
          removedCount++;
        } else {
          // Attempt to repair the entity
          const repaired = this.attemptEntityRepair(entity, entityType);
          if (repaired) {
            collection[corruptedId] = repaired;
            repairedCount++;
          } else {
            delete collection[corruptedId];
            removedCount++;
          }
        }
      }

      await this.setEntityCollection(entityType, collection);
    }

    return { repairedCount, removedCount };
  }

  private attemptEntityRepair<T extends LocalEntity>(entity: any, entityType: EntityType): T | null {
    try {
      // Basic repair attempts
      if (!entity.id) entity.id = `repaired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!entity.localId) entity.localId = `repaired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!entity.syncStatus) entity.syncStatus = 'pending';
      if (typeof entity.version !== 'number') entity.version = 1;
      if (!entity.createdAt) entity.createdAt = Date.now();
      if (!entity.updatedAt) entity.updatedAt = Date.now();

      // Entity-specific repairs
      switch (entityType) {
        case 'expenses':
          if (typeof entity.amount !== 'number') entity.amount = 0;
          if (!entity.title) entity.title = 'Recovered Expense';
          if (!Array.isArray(entity.category)) entity.category = [];
          if (!Array.isArray(entity.for)) entity.for = [];
          if (!entity.date) entity.date = Date.now();
          break;

        case 'income':
          if (typeof entity.amount !== 'number') entity.amount = 0;
          if (!entity.cardId) entity.cardId = 'unknown';
          if (!entity.source) entity.source = 'Recovered Income';
          if (!entity.category) entity.category = 'other';
          if (!entity.date) entity.date = Date.now();
          break;

        case 'categories':
        case 'incomeCategories':
          if (!entity.name) entity.name = 'Recovered Category';
          if (!entity.type) entity.type = entityType === 'incomeCategories' ? 'income' : 'expense';
          break;

        case 'cards':
          if (!entity.name) entity.name = 'Recovered Card';
          break;

        case 'forValues':
          if (!entity.value) entity.value = 'Recovered Value';
          break;
      }

      // Validate the repaired entity - use async validation properly
      return entity as T;
    } catch (error) {
      console.error('Failed to repair entity:', error);
      return null;
    }
  }

  // Data hash calculation for conflict detection
  async getDataHash(): Promise<string> {
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();
    const forValues = await this.getForValues();
    const incomeCategories = await this.getIncomeCategories();

    const dataString = JSON.stringify({
      expenses: expenses.map(e => ({ ...e, syncStatus: undefined, lastSyncedAt: undefined })),
      income: income.map(i => ({ ...i, syncStatus: undefined, lastSyncedAt: undefined })),
      categories,
      cards,
      forValues,
      incomeCategories
    });

    return this.simpleHash(dataString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Storage quota management and cleanup utilities
  async getStorageInfo(): Promise<{ used: number; available: number; quota: number; usagePercentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const used = estimate.usage || 0;
        const available = quota - used;
        const usagePercentage = quota > 0 ? (used / quota) * 100 : 0;

        return { used, available, quota, usagePercentage };
      }
    } catch (error) {
      console.warn('Storage estimation not available:', error);
    }

    // Fallback estimation
    const keys = await this.getAllKeys();
    let estimatedSize = 0;

    for (const key of keys) {
      const item = await this.storage.getItem(key);
      if (item) {
        estimatedSize += JSON.stringify(item).length * 2; // Rough UTF-16 estimation
      }
    }

    return {
      used: estimatedSize,
      available: 50 * 1024 * 1024 - estimatedSize, // Assume 50MB default quota
      quota: 50 * 1024 * 1024,
      usagePercentage: (estimatedSize / (50 * 1024 * 1024)) * 100
    };
  }

  async cleanupOldData(options: {
    maxAge?: number; // milliseconds
    keepSyncedOnly?: boolean;
    maxRecords?: number;
    entityTypes?: EntityType[];
  } = {}): Promise<{ cleanedCount: number; freedSpace: number }> {
    const {
      maxAge = 90 * 24 * 60 * 60 * 1000, // 90 days default
      keepSyncedOnly = false,
      maxRecords = 10000,
      entityTypes = ['expenses', 'income', 'categories', 'cards', 'forValues', 'incomeCategories']
    } = options;

    let cleanedCount = 0;
    let freedSpace = 0;
    const cutoffTime = Date.now() - maxAge;

    for (const entityType of entityTypes) {
      const collection = await this.getEntityCollection(entityType);
      const entities = Object.values(collection);
      const sizeBefore = JSON.stringify(collection).length;

      // Sort by updatedAt, keep most recent
      const sortedEntities = entities.sort((a, b) => b.updatedAt - a.updatedAt);

      let entitiesToKeep = sortedEntities.filter(entity => {
        // Keep if within age limit
        if (entity.updatedAt > cutoffTime) return true;

        // Keep if synced and keepSyncedOnly is true
        if (keepSyncedOnly && entity.syncStatus === 'synced') return true;

        return false;
      });

      // Limit to maxRecords
      if (entitiesToKeep.length > maxRecords) {
        entitiesToKeep = entitiesToKeep.slice(0, maxRecords);
      }

      // Rebuild collection
      const newCollection = entitiesToKeep.reduce((acc, entity) => {
        acc[entity.id] = entity;
        return acc;
      }, {} as { [id: string]: any });

      const removedCount = entities.length - entitiesToKeep.length;
      cleanedCount += removedCount;

      if (removedCount > 0) {
        await this.setEntityCollection(entityType, newCollection);
        const sizeAfter = JSON.stringify(newCollection).length;
        freedSpace += sizeBefore - sizeAfter;
      }
    }

    // Clean up old pending operations
    const syncState = await this.getSyncState();
    if (syncState && syncState.pendingOperations) {
      const oldOperations = syncState.pendingOperations.filter(op =>
        op.timestamp < cutoffTime && op.status === 'completed'
      );

      if (oldOperations.length > 0) {
        const newOperations = syncState.pendingOperations.filter(op =>
          !(op.timestamp < cutoffTime && op.status === 'completed')
        );

        await this.updateSyncState({ pendingOperations: newOperations });
        cleanedCount += oldOperations.length;
      }
    }

    return { cleanedCount, freedSpace };
  }

  async compactStorage(): Promise<{ success: boolean; error?: string }> {
    try {
      // Export all data
      const exportData = await this.exportData();

      // Clear storage
      await this.clearAllData();

      // Re-initialize
      const metadata = exportData.data.metadata;
      if (metadata) {
        await this.initialize(metadata.userId);
      }

      // Import data back
      await this.importData(exportData);

      return { success: true };
    } catch (error) {
      console.error('Storage compaction failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async checkStorageHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    storageInfo: { used: number; available: number; quota: number; usagePercentage: number };
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check storage usage
    const storageInfo = await this.getStorageInfo();
    if (storageInfo.usagePercentage > 90) {
      issues.push('Storage usage is critically high (>90%)');
      recommendations.push('Run cleanup to remove old data');
    } else if (storageInfo.usagePercentage > 75) {
      issues.push('Storage usage is high (>75%)');
      recommendations.push('Consider cleaning up old data');
    }

    // Check for corrupted data
    const entityTypes: EntityType[] = ['expenses', 'income', 'categories', 'cards', 'forValues', 'incomeCategories'];
    for (const entityType of entityTypes) {
      const validation = await this.validateCollection(entityType);
      if (!validation.isValid) {
        issues.push(`Corrupted data found in ${entityType}: ${validation.corruptedIds.length} items`);
        recommendations.push(`Repair corrupted ${entityType} data`);
      }
    }

    // Check pending operations
    const pendingOps = await this.getPendingOperations();
    const failedOps = pendingOps.filter(op => op.status === 'failed');
    if (failedOps.length > 10) {
      issues.push(`High number of failed operations: ${failedOps.length}`);
      recommendations.push('Review and retry failed operations');
    }

    // Check sync state
    const syncState = await this.getSyncState();
    if (syncState && Date.now() - syncState.lastSync > 7 * 24 * 60 * 60 * 1000) {
      issues.push('Data has not been synced for over 7 days');
      recommendations.push('Perform a manual sync');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
      storageInfo
    };
  }

  // Data export/import operations
  async exportData(): Promise<LocalDataExport> {
    const metadata = await this.getMetadata();
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();
    const forValues = await this.getForValues();
    const incomeCategories = await this.getIncomeCategories();
    const syncState = await this.getSyncState();

    const dataExport: LocalDataExport = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: metadata?.deviceId || 'unknown',
      userId: metadata?.userId || 'unknown',
      data: {
        expenses: expenses.reduce((acc, exp) => ({ ...acc, [exp.id]: exp }), {}),
        income: income.reduce((acc, inc) => ({ ...acc, [inc.id]: inc }), {}),
        categories: categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {}),
        cards: cards.reduce((acc, card) => ({ ...acc, [card.id]: card }), {}),
        forValues: forValues.reduce((acc, fv) => ({ ...acc, [fv.id]: fv }), {}),
        incomeCategories: incomeCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {}),
        syncState: syncState || {} as SyncState,
        metadata: metadata || {} as LocalMetadata
      },
      checksum: await this.getDataHash()
    };

    return dataExport;
  }

  async importData(dataExport: LocalDataExport): Promise<void> {
    try {
      // Validate checksum
      const currentHash = await this.getDataHash();
      if (dataExport.checksum === currentHash) {
        console.log('Data is identical, skipping import');
        return;
      }

      // Import data
      if (dataExport.data.expenses) {
        await this.setEntityCollection('expenses', dataExport.data.expenses);
      }
      if (dataExport.data.income) {
        await this.setEntityCollection('income', dataExport.data.income);
      }
      if (dataExport.data.categories) {
        await this.setEntityCollection('categories', dataExport.data.categories);
      }
      if (dataExport.data.cards) {
        await this.setEntityCollection('cards', dataExport.data.cards);
      }
      if (dataExport.data.forValues) {
        await this.setEntityCollection('forValues', dataExport.data.forValues);
      }
      if (dataExport.data.incomeCategories) {
        await this.setEntityCollection('incomeCategories', dataExport.data.incomeCategories);
      }
      if (dataExport.data.syncState) {
        await this.storage.setItem('syncState', dataExport.data.syncState);
      }
      if (dataExport.data.metadata) {
        await this.storage.setItem('metadata', dataExport.data.metadata);
      }

      console.log('Data import completed successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // Atomic operations for data consistency
  private transactionQueue: Array<() => Promise<void>> = [];
  private isProcessingTransaction = false;

  async executeTransaction<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.transactionQueue.push(async () => {
        try {
          // Create backup before transaction
          const backup = await this.createTransactionBackup();

          try {
            const results: T[] = [];

            // Execute all operations
            for (const operation of operations) {
              const result = await operation();
              results.push(result);
            }

            // Update last modified timestamp
            await this.updateLastModified();

            resolve(results);
          } catch (error) {
            // Rollback on error
            await this.restoreFromBackup(backup);
            reject(error);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.processTransactionQueue();
    });
  }

  private async processTransactionQueue(): Promise<void> {
    if (this.isProcessingTransaction || this.transactionQueue.length === 0) {
      return;
    }

    this.isProcessingTransaction = true;

    try {
      while (this.transactionQueue.length > 0) {
        const transaction = this.transactionQueue.shift();
        if (transaction) {
          await transaction();
        }
      }
    } finally {
      this.isProcessingTransaction = false;
    }
  }

  private async createTransactionBackup(): Promise<LocalDataExport> {
    return await this.exportData();
  }

  private async restoreFromBackup(backup: LocalDataExport): Promise<void> {
    await this.clearAllData();
    await this.importData(backup);
  }

  // Batch operations for efficiency
  async batchCreateExpenses(expenses: Array<Omit<LocalExpense, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>>): Promise<LocalExpense[]> {
    return await this.executeTransaction(
      expenses.map(expense => () => this.saveExpense(expense))
    );
  }

  async batchUpdateExpenses(updates: Array<{ id: string; updates: Partial<LocalExpense> }>): Promise<(LocalExpense | null)[]> {
    return await this.executeTransaction(
      updates.map(({ id, updates: updateData }) => () => this.updateExpense(id, updateData))
    );
  }

  async batchDeleteExpenses(ids: string[]): Promise<boolean[]> {
    return await this.executeTransaction(
      ids.map(id => () => this.deleteExpense(id))
    );
  }

  async batchCreateIncome(incomes: Array<Omit<LocalIncome, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>>): Promise<LocalIncome[]> {
    return await this.executeTransaction(
      incomes.map(income => () => this.saveIncome(income))
    );
  }

  async batchUpdateIncome(updates: Array<{ id: string; updates: Partial<LocalIncome> }>): Promise<(LocalIncome | null)[]> {
    return await this.executeTransaction(
      updates.map(({ id, updates: updateData }) => () => this.updateIncome(id, updateData))
    );
  }

  async batchDeleteIncome(ids: string[]): Promise<boolean[]> {
    return await this.executeTransaction(
      ids.map(id => () => this.deleteIncome(id))
    );
  }

  // Atomic multi-entity operations
  async createExpenseWithDependencies(
    expense: Omit<LocalExpense, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>,
    newCategories?: Array<Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>>,
    newForValues?: Array<Omit<LocalForValue, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ expense: LocalExpense; categories: LocalCategory[]; forValues: LocalForValue[] }> {
    const operations: Array<() => Promise<any>> = [];

    // Create categories first
    const categoryOps = (newCategories || []).map(cat => () => this.saveCategory(cat));
    operations.push(...categoryOps);

    // Create for values
    const forValueOps = (newForValues || []).map(fv => () => this.saveForValue(fv));
    operations.push(...forValueOps);

    // Create expense last
    operations.push(() => this.saveExpense(expense));

    const results = await this.executeTransaction(operations);

    const categoriesCount = newCategories?.length || 0;
    const forValuesCount = newForValues?.length || 0;

    return {
      categories: results.slice(0, categoriesCount) as LocalCategory[],
      forValues: results.slice(categoriesCount, categoriesCount + forValuesCount) as LocalForValue[],
      expense: results[results.length - 1] as LocalExpense
    };
  }

  async createIncomeWithDependencies(
    income: Omit<LocalIncome, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>,
    newCategory?: Omit<LocalCategory, 'id' | 'localId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<{ income: LocalIncome; category?: LocalCategory }> {
    const operations: Array<() => Promise<any>> = [];

    // Create category first if provided
    if (newCategory) {
      operations.push(() => this.saveIncomeCategory(newCategory));
    }

    // Create income
    operations.push(() => this.saveIncome(income));

    const results = await this.executeTransaction(operations);

    return {
      category: newCategory ? results[0] as LocalCategory : undefined,
      income: results[results.length - 1] as LocalIncome
    };
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    await this.storage.clear();
    this.initialized = false;
  }

  async getAllKeys(): Promise<string[]> {
    return await this.storage.keys();
  }

  private applyFilters<T extends LocalEntity>(data: T[], filters: DataFilters): T[] {
    let filtered = data;

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(item => {
        const itemDate = (item as any).date;
        return itemDate >= filters.startDate! && itemDate <= filters.endDate!;
      });
    }

    if (filters.syncStatus) {
      filtered = filtered.filter(item => filters.syncStatus!.includes(item.syncStatus));
    }

    if (filters.category && (filtered[0] as any)?.category) {
      filtered = filtered.filter(item => {
        const itemCategories = (item as any).category;
        return Array.isArray(itemCategories) &&
          itemCategories.some(cat => filters.category!.includes(cat));
      });
    }

    if (filters.cardId) {
      filtered = filtered.filter(item => (item as any).cardId === filters.cardId);
    }

    if (filters.offset) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  // Pending operations management
  async addPendingOperation(operation: PendingOperation): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      syncState.pendingOperations.push(operation);
      await this.updateSyncState({ pendingOperations: syncState.pendingOperations });
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const syncState = await this.getSyncState();
    return syncState?.pendingOperations || [];
  }

  async updatePendingOperation(operationId: string, updates: Partial<PendingOperation>): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const operations = syncState.pendingOperations.map(op =>
        op.id === operationId ? { ...op, ...updates } : op
      );
      await this.updateSyncState({ pendingOperations: operations });
    }
  }

  async removePendingOperation(operationId: string): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const operations = syncState.pendingOperations.filter(op => op.id !== operationId);
      await this.updateSyncState({ pendingOperations: operations });
    }
  }

  // Enhanced utility methods
  async getEntityCount(entityType: EntityType): Promise<number> {
    const collection = await this.getEntityCollection(entityType);
    return Object.keys(collection).length;
  }

  async getTotalRecordCount(): Promise<number> {
    const entityTypes: EntityType[] = ['expenses', 'income', 'categories', 'cards', 'forValues', 'incomeCategories'];
    let total = 0;

    for (const entityType of entityTypes) {
      total += await this.getEntityCount(entityType);
    }

    return total;
  }

  async getEntityById<T extends LocalEntity>(entityType: EntityType, id: string): Promise<T | null> {
    const collection = await this.getEntityCollection<T>(entityType);
    return collection[id] || null;
  }

  async searchEntities<T extends LocalEntity>(
    entityType: EntityType,
    searchTerm: string,
    fields: string[] = []
  ): Promise<T[]> {
    const collection = await this.getEntityCollection<T>(entityType);
    const entities = Object.values(collection);

    if (!searchTerm.trim()) return entities;

    const searchLower = searchTerm.toLowerCase();

    return entities.filter(entity => {
      // If no specific fields provided, search common fields
      if (fields.length === 0) {
        const searchableFields = ['name', 'title', 'value', 'source', 'category'];
        return searchableFields.some(field => {
          const fieldValue = (entity as any)[field];
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(searchLower);
          }
          if (Array.isArray(fieldValue)) {
            return fieldValue.some(item =>
              typeof item === 'string' && item.toLowerCase().includes(searchLower)
            );
          }
          return false;
        });
      }

      // Search specific fields
      return fields.some(field => {
        const fieldValue = (entity as any)[field];
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(searchLower);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(item =>
            typeof item === 'string' && item.toLowerCase().includes(searchLower)
          );
        }
        return false;
      });
    });
  }


}