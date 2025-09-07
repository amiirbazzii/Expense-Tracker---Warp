import localforage from 'localforage';
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
    return collection || {};
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

  // Data hash calculation for conflict detection
  async getDataHash(): Promise<string> {
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();

    const dataString = JSON.stringify({
      expenses: expenses.map(e => ({ ...e, syncStatus: undefined, lastSyncedAt: undefined })),
      income: income.map(i => ({ ...i, syncStatus: undefined, lastSyncedAt: undefined })),
      categories,
      cards
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

  // Data export/import operations
  async exportData(): Promise<LocalDataExport> {
    const metadata = await this.getMetadata();
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();
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
}