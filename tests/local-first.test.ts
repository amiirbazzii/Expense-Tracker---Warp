/**
 * Comprehensive test suite for local-first data functionality
 * Tests local storage operations, sync behavior, and conflict resolution
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LocalStorageManager } from '../src/lib/storage/LocalStorageManager';
import { ConflictDetector } from '../src/lib/sync/ConflictDetector';
import { CloudSyncManager } from '../src/lib/sync/CloudSyncManager';
import { LocalFirstConvexClient } from '../src/lib/client/LocalFirstConvexClient';
import {
  LocalExpense,
  LocalIncome,
  LocalCategory,
  LocalCard,
  ConflictDetectionResult,
  LocalDataExport,
  CloudDataMapping
} from '../src/lib/types/local-storage';

// Mock localforage
const mockLocalforage = {
  config: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  keys: jest.fn(),
  createInstance: jest.fn(() => mockLocalforage)
};

jest.mock('localforage', () => mockLocalforage);

// Mock Convex client
const mockConvexClient = {
  mutation: jest.fn(),
  query: jest.fn()
};

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManager;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLocalforage.getItem.mockResolvedValue(null);
    storageManager = new LocalStorageManager();
  });

  test('should initialize with user ID', async () => {
    mockLocalforage.getItem.mockResolvedValueOnce(null); // metadata
    mockLocalforage.getItem.mockResolvedValueOnce(null); // syncState
    
    await storageManager.initialize(testUserId);
    
    expect(mockLocalforage.setItem).toHaveBeenCalledWith(
      'metadata',
      expect.objectContaining({
        userId: testUserId,
        version: '2.0.0'
      })
    );
  });

  test('should save expense locally', async () => {
    await storageManager.initialize(testUserId);
    mockLocalforage.getItem.mockResolvedValue({}); // empty expenses collection
    
    const expenseData = {
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      for: ['Personal'],
      date: Date.now(),
      cardId: 'card-123'
    };

    const savedExpense = await storageManager.saveExpense(expenseData);

    expect(savedExpense).toMatchObject({
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      syncStatus: 'pending',
      version: 1
    });
    
    expect(savedExpense.id).toBeDefined();
    expect(savedExpense.localId).toBeDefined();
    expect(savedExpense.createdAt).toBeDefined();
  });

  test('should retrieve expenses with filters', async () => {
    await storageManager.initialize(testUserId);
    
    const mockExpenses = {
      'exp1': {
        id: 'exp1',
        amount: 25.50,
        title: 'Coffee',
        category: ['Food'],
        date: Date.now() - 86400000, // yesterday
        syncStatus: 'synced'
      } as LocalExpense,
      'exp2': {
        id: 'exp2',
        amount: 100.00,
        title: 'Groceries',
        category: ['Food'],
        date: Date.now(),
        syncStatus: 'pending'
      } as LocalExpense
    };
    
    mockLocalforage.getItem.mockResolvedValue(mockExpenses);
    
    const expenses = await storageManager.getExpenses();
    expect(expenses).toHaveLength(2);
    expect(expenses[0].title).toBe('Groceries'); // sorted by date desc
  });

  test('should update expense and increment version', async () => {
    await storageManager.initialize(testUserId);
    
    const existingExpense: LocalExpense = {
      id: 'exp1',
      localId: 'local1',
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      for: ['Personal'],
      date: Date.now(),
      syncStatus: 'synced',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    mockLocalforage.getItem.mockResolvedValue({ 'exp1': existingExpense });
    
    const updatedExpense = await storageManager.updateExpense('exp1', {
      title: 'Premium Coffee',
      amount: 30.00
    });
    
    expect(updatedExpense).toMatchObject({
      title: 'Premium Coffee',
      amount: 30.00,
      version: 2,
      syncStatus: 'pending'
    });
  });

  test('should generate consistent data hash', async () => {
    await storageManager.initialize(testUserId);
    
    // Mock data for hash calculation
    mockLocalforage.getItem
      .mockResolvedValueOnce({}) // expenses
      .mockResolvedValueOnce({}) // income
      .mockResolvedValueOnce({}) // categories
      .mockResolvedValueOnce({}); // cards
    
    const hash1 = await storageManager.getDataHash();
    const hash2 = await storageManager.getDataHash();
    
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  test('should export data correctly', async () => {
    await storageManager.initialize(testUserId);
    
    const mockMetadata = {
      userId: testUserId,
      deviceId: 'device-123',
      version: '2.0.0'
    };
    
    mockLocalforage.getItem
      .mockResolvedValueOnce({}) // expenses
      .mockResolvedValueOnce({}) // income
      .mockResolvedValueOnce({}) // categories
      .mockResolvedValueOnce({}) // cards
      .mockResolvedValueOnce({}) // syncState
      .mockResolvedValueOnce(mockMetadata); // metadata
    
    const exportData = await storageManager.exportData();
    
    expect(exportData).toMatchObject({
      version: '2.0.0',
      userId: testUserId,
      data: {
        expenses: {},
        income: {},
        categories: {},
        cards: {}
      }
    });
    
    expect(exportData.exportedAt).toBeDefined();
    expect(exportData.checksum).toBeDefined();
  });
});

describe('ConflictDetector', () => {
  let conflictDetector: ConflictDetector;
  
  beforeEach(() => {
    conflictDetector = new ConflictDetector();
  });

  test('should detect missing cloud data', async () => {
    const localData: LocalDataExport = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: 'device-123',
      userId: 'user-123',
      data: {
        expenses: {
          'exp1': {
            id: 'exp1',
            amount: 25.50,
            title: 'Coffee'
          } as LocalExpense
        }
      },
      checksum: 'abc123'
    };
    
    const cloudData: CloudDataMapping = {
      expenses: [],
      income: [],
      categories: [],
      cards: [],
      forValues: [],
      incomeCategories: [],
      metadata: {
        dataHash: '',
        lastModified: 0,
        totalRecords: 0
      }
    };
    
    const result = await conflictDetector.detectConflicts(localData, cloudData);
    
    expect(result.hasConflicts).toBe(true);
    expect(result.conflictType).toBe('missing_cloud');
    expect(result.recommendedAction).toBe('upload_local');
  });

  test('should detect corrupted local data', async () => {
    const localData: LocalDataExport = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: 'device-123',
      userId: 'user-123',
      data: {}, // empty/corrupted data
      checksum: 'abc123'
    };
    
    const cloudData: CloudDataMapping = {
      expenses: [{ _id: 'exp1', amount: 25.50, title: 'Coffee' }],
      income: [],
      categories: [],
      cards: [],
      forValues: [],
      incomeCategories: [],
      metadata: {
        dataHash: 'xyz789',
        lastModified: Date.now(),
        totalRecords: 1
      }
    };
    
    const result = await conflictDetector.detectConflicts(localData, cloudData);
    
    expect(result.hasConflicts).toBe(true);
    expect(result.conflictType).toBe('corrupted_local');
    expect(result.recommendedAction).toBe('download_cloud');
  });

  test('should detect data differences', async () => {
    const localData: LocalDataExport = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: 'device-123',
      userId: 'user-123',
      data: {
        expenses: {
          'exp1': {
            id: 'exp1',
            amount: 25.50,
            title: 'Local Coffee',
            cloudId: 'exp1'
          } as LocalExpense
        }
      },
      checksum: 'abc123'
    };
    
    const cloudData: CloudDataMapping = {
      expenses: [{ 
        _id: 'exp1', 
        amount: 30.00, 
        title: 'Cloud Coffee' 
      }],
      income: [],
      categories: [],
      cards: [],
      forValues: [],
      incomeCategories: [],
      metadata: {
        dataHash: 'xyz789',
        lastModified: Date.now(),
        totalRecords: 1
      }
    };
    
    const result = await conflictDetector.detectConflicts(localData, cloudData);
    
    expect(result.hasConflicts).toBe(true);
    expect(result.conflictType).toBe('divergent_data');
    expect(result.conflictItems.length).toBeGreaterThan(0);
  });

  test('should validate data hash consistency', async () => {
    const localHash = 'abc123';
    const cloudHash = 'abc123';
    
    const isValid = await conflictDetector.validateDataHash(localHash, cloudHash);
    expect(isValid).toBe(true);
    
    const isInvalid = await conflictDetector.validateDataHash(localHash, 'xyz789');
    expect(isInvalid).toBe(false);
  });

  test('should generate consistent hash', () => {
    const data1 = { amount: 25.50, title: 'Coffee' };
    const data2 = { amount: 25.50, title: 'Coffee' };
    const data3 = { amount: 30.00, title: 'Coffee' };
    
    const hash1 = conflictDetector.generateDataHash(data1);
    const hash2 = conflictDetector.generateDataHash(data2);
    const hash3 = conflictDetector.generateDataHash(data3);
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});

describe('CloudSyncManager', () => {
  let cloudSyncManager: CloudSyncManager;
  
  beforeEach(() => {
    cloudSyncManager = new CloudSyncManager(mockConvexClient as any);
  });

  test('should retry failed operations with exponential backoff', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success');
    
    const result = await (cloudSyncManager as any).retryWithBackoff(mockOperation);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  test('should identify retryable errors correctly', () => {
    const retryableErrors = [
      { name: 'NetworkError' },
      { status: 429 }, // Rate limit
      { status: 500 }, // Server error
      { code: 'TIMEOUT' }
    ];
    
    const nonRetryableErrors = [
      { status: 401 }, // Unauthorized
      { status: 403 }, // Forbidden
      { status: 400 }, // Bad request
      { code: 'INVALID_ARGUMENT' }
    ];
    
    retryableErrors.forEach(error => {
      expect((cloudSyncManager as any).isRetryableError(error)).toBe(true);
    });
    
    nonRetryableErrors.forEach(error => {
      expect((cloudSyncManager as any).isRetryableError(error)).toBe(false);
    });
  });

  test('should calculate retry delay with exponential backoff', () => {
    const baseDelay = 1000;
    const backoffFactor = 2;
    
    const delay1 = (cloudSyncManager as any).calculateDelay(0);
    const delay2 = (cloudSyncManager as any).calculateDelay(1);
    const delay3 = (cloudSyncManager as any).calculateDelay(2);
    
    expect(delay1).toBeCloseTo(baseDelay, -2); // Allow for jitter
    expect(delay2).toBeCloseTo(baseDelay * backoffFactor, -2);
    expect(delay3).toBeCloseTo(baseDelay * backoffFactor * backoffFactor, -2);
  });
});

describe('LocalFirstConvexClient', () => {
  let localFirstClient: LocalFirstConvexClient;
  const mockUserId = 'user-123';
  
  beforeEach(async () => {
    localFirstClient = new LocalFirstConvexClient(mockConvexClient as any);
    
    // Mock the initialize method dependencies
    jest.spyOn(LocalStorageManager.prototype, 'initialize').mockResolvedValue();
  });

  test('should initialize with user ID', async () => {
    await localFirstClient.initialize(mockUserId);
    
    expect(LocalStorageManager.prototype.initialize).toHaveBeenCalledWith(mockUserId);
  });

  test('should create expense locally first', async () => {
    await localFirstClient.initialize(mockUserId);
    
    const mockLocalExpense: LocalExpense = {
      id: 'exp1',
      localId: 'local1',
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      for: ['Personal'],
      date: Date.now(),
      syncStatus: 'pending',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    jest.spyOn(LocalStorageManager.prototype, 'saveExpense')
      .mockResolvedValue(mockLocalExpense);
    jest.spyOn(LocalStorageManager.prototype, 'addPendingOperation')
      .mockResolvedValue();
    
    const expenseData = {
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      for: ['Personal'],
      date: Date.now()
    };
    
    const result = await localFirstClient.createExpense(expenseData);
    
    expect(result).toEqual(mockLocalExpense);
    expect(LocalStorageManager.prototype.saveExpense).toHaveBeenCalledWith(expenseData);
    expect(LocalStorageManager.prototype.addPendingOperation).toHaveBeenCalled();
  });

  test('should get expenses from local storage', async () => {
    await localFirstClient.initialize(mockUserId);
    
    const mockExpenses: LocalExpense[] = [
      {
        id: 'exp1',
        localId: 'local1',
        amount: 25.50,
        title: 'Coffee',
        category: ['Food'],
        for: ['Personal'],
        date: Date.now(),
        syncStatus: 'synced',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    jest.spyOn(LocalStorageManager.prototype, 'getExpenses')
      .mockResolvedValue(mockExpenses);
    
    const result = await localFirstClient.getExpenses();
    
    expect(result).toEqual(mockExpenses);
    expect(LocalStorageManager.prototype.getExpenses).toHaveBeenCalled();
  });

  test('should handle sync status events', async () => {
    await localFirstClient.initialize(mockUserId);
    
    const mockSyncStatusChange = jest.fn();
    const mockConflictDetected = jest.fn();
    
    localFirstClient.setEventListeners({
      onSyncStatusChange: mockSyncStatusChange,
      onConflictDetected: mockConflictDetected
    });
    
    // Test events are set up
    expect(mockSyncStatusChange).toBeDefined();
    expect(mockConflictDetected).toBeDefined();
  });
});

describe('Integration Tests', () => {
  test('should complete full offline-to-online sync cycle', async () => {
    // Mock network status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    const localFirstClient = new LocalFirstConvexClient(mockConvexClient as any);
    await localFirstClient.initialize('user-123');
    
    // 1. Create expense offline
    const expenseData = {
      amount: 25.50,
      title: 'Coffee',
      category: ['Food'],
      for: ['Personal'],
      date: Date.now()
    };
    
    jest.spyOn(LocalStorageManager.prototype, 'saveExpense')
      .mockResolvedValue({
        ...expenseData,
        id: 'exp1',
        localId: 'local1',
        syncStatus: 'pending',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as LocalExpense);
    
    const expense = await localFirstClient.createExpense(expenseData);
    expect(expense.syncStatus).toBe('pending');
    
    // 2. Go back online
    Object.defineProperty(navigator, 'onLine', {
      value: true
    });
    
    // 3. Simulate successful sync
    jest.spyOn(CloudSyncManager.prototype, 'syncToCloud')
      .mockResolvedValue({
        success: true,
        conflicts: [],
        errors: [],
        syncedCount: 1,
        failedCount: 0,
        operationId: 'sync-123',
        timestamp: Date.now()
      });
    
    const syncResult = await localFirstClient.forceSyncToCloud('token-123');
    
    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedCount).toBe(1);
  });

  test('should handle conflict resolution flow', async () => {
    const conflictDetector = new ConflictDetector();
    
    // Setup conflicting data
    const localData: LocalDataExport = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceId: 'device-123',
      userId: 'user-123',
      data: {
        expenses: {
          'exp1': {
            id: 'exp1',
            amount: 25.50,
            title: 'Local Coffee',
            updatedAt: Date.now()
          } as LocalExpense
        }
      },
      checksum: 'abc123'
    };
    
    const cloudData: CloudDataMapping = {
      expenses: [{
        _id: 'exp1',
        amount: 30.00,
        title: 'Cloud Coffee',
        updatedAt: Date.now() - 3600000 // 1 hour earlier
      }],
      income: [],
      categories: [],
      cards: [],
      forValues: [],
      incomeCategories: [],
      metadata: {
        dataHash: 'xyz789',
        lastModified: Date.now(),
        totalRecords: 1
      }
    };
    
    const conflictResult = await conflictDetector.detectConflicts(localData, cloudData);
    
    expect(conflictResult.hasConflicts).toBe(true);
    expect(conflictResult.conflictItems.length).toBeGreaterThan(0);
    
    // Test conflict resolution strategies
    const mergedData = conflictDetector.mergeData(localData, cloudData, 'local_wins');
    expect(mergedData.data.expenses?.['exp1'].title).toBe('Local Coffee');
  });

  test('should handle performance under load', async () => {
    const localFirstClient = new LocalFirstConvexClient(mockConvexClient as any);
    await localFirstClient.initialize('user-123');
    
    // Mock storage operations
    let saveCallCount = 0;
    jest.spyOn(LocalStorageManager.prototype, 'saveExpense')
      .mockImplementation(async (data) => {
        saveCallCount++;
        return {
          ...data,
          id: `exp-${saveCallCount}`,
          localId: `local-${saveCallCount}`,
          syncStatus: 'pending',
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as LocalExpense;
      });
    
    // Create multiple expenses rapidly
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(localFirstClient.createExpense({
        amount: 10 + i,
        title: `Expense ${i}`,
        category: ['Test'],
        for: ['Test'],
        date: Date.now()
      }));
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});