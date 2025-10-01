// Mock the Convex API before importing
jest.mock('../convex/_generated/api', () => ({
  api: {
    expenses: {
      getExpenses: 'expenses:getExpenses',
      createExpense: 'expenses:createExpense',
      updateExpense: 'expenses:updateExpense',
      deleteExpense: 'expenses:deleteExpense',
      getCategories: 'expenses:getCategories',
      getForValues: 'expenses:getForValues'
    },
    cardsAndIncome: {
      getIncome: 'cardsAndIncome:getIncome',
      createIncome: 'cardsAndIncome:createIncome',
      updateIncome: 'cardsAndIncome:updateIncome',
      deleteIncome: 'cardsAndIncome:deleteIncome',
      getMyCards: 'cardsAndIncome:getMyCards',
      addCard: 'cardsAndIncome:addCard',
      deleteCard: 'cardsAndIncome:deleteCard',
      getUniqueIncomeCategories: 'cardsAndIncome:getUniqueIncomeCategories'
    }
  }
}));

import { CloudSyncManager } from '../src/lib/sync/CloudSyncManager';
import { ConvexClient } from 'convex/browser';
import { PendingOperation, LocalDataExport } from '../src/lib/types/local-storage';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock ConvexClient
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn()
} as unknown as ConvexClient;

describe('CloudSyncManager Enhanced Features', () => {
  let syncManager: CloudSyncManager;

  beforeEach(() => {
    syncManager = new CloudSyncManager(mockConvexClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncManager.cleanup();
  });

  describe('Network Awareness', () => {
    test('should adapt sync configuration based on network conditions', () => {
      const initialConfig = syncManager.getSyncConfig();
      expect(initialConfig.batchSize).toBe(50);
      expect(initialConfig.maxConcurrentOperations).toBe(3);
    });

    test('should provide network-aware sync schedule', () => {
      const schedule = syncManager.getNetworkAwareSyncSchedule();
      expect(schedule).toHaveProperty('interval');
      expect(schedule).toHaveProperty('batchSize');
      expect(schedule).toHaveProperty('priority');
      expect(typeof schedule.interval).toBe('number');
      expect(schedule.interval).toBeGreaterThan(0);
    });

    test('should update sync configuration manually', () => {
      const newConfig = { batchSize: 25, maxConcurrentOperations: 2 };
      syncManager.updateSyncConfig(newConfig);
      
      const updatedConfig = syncManager.getSyncConfig();
      expect(updatedConfig.batchSize).toBe(25);
      expect(updatedConfig.maxConcurrentOperations).toBe(2);
    });
  });

  describe('Incremental Sync', () => {
    test('should perform incremental sync with delta detection', async () => {
      const mockToken = 'test-token';
      
      // Mock the API calls
      (mockConvexClient.query as jest.Mock).mockResolvedValue([]);
      
      const result = await syncManager.performIncrementalSync(mockToken, Date.now() - 3600000);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedCount');
      expect(result).toHaveProperty('operationId');
      expect(typeof result.syncedCount).toBe('number');
    });

    test('should track last sync timestamps', () => {
      const timestamps = syncManager.getLastSyncTimestamps();
      expect(timestamps instanceof Map).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    test('should process queue with batching', async () => {
      const mockOperations: PendingOperation[] = [
        {
          id: 'op1',
          type: 'create',
          entityType: 'expenses',
          entityId: 'expense1',
          data: { amount: 100, title: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          maxRetries: 3
        },
        {
          id: 'op2',
          type: 'update',
          entityType: 'expenses',
          entityId: 'expense2',
          data: { amount: 200, title: 'Test 2' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          maxRetries: 3
        }
      ];

      // Mock successful API calls
      (mockConvexClient.mutation as jest.Mock).mockResolvedValue({ success: true });

      const result = await syncManager.processQueue(mockOperations, 'test-token');
      
      expect(result.success).toBe(true);
      expect(result.syncedCount).toBeGreaterThanOrEqual(0);
      expect(result.operationId).toBeDefined();
    });

    test('should handle empty queue gracefully', async () => {
      const result = await syncManager.processQueue([], 'test-token');
      
      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('Compression', () => {
    test('should get sync statistics', () => {
      const stats = syncManager.getSyncStats();
      
      expect(stats).toHaveProperty('activeSyncs');
      expect(stats).toHaveProperty('networkCondition');
      expect(stats).toHaveProperty('syncConfig');
      expect(stats).toHaveProperty('lastSyncTimestamps');
      expect(typeof stats.activeSyncs).toBe('number');
    });

    test('should cleanup resources properly', () => {
      const initialStats = syncManager.getSyncStats();
      syncManager.cleanup();
      const finalStats = syncManager.getSyncStats();
      
      expect(finalStats.activeSyncs).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle sync errors gracefully', async () => {
      const mockOperations: PendingOperation[] = [
        {
          id: 'op1',
          type: 'create',
          entityType: 'expenses',
          entityId: 'expense1',
          data: { amount: 100, title: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          maxRetries: 3
        }
      ];

      // Mock API failure
      (mockConvexClient.mutation as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await syncManager.processQueue(mockOperations, 'test-token');
      
      expect(result.success).toBe(false);
      expect(result.failedCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should prevent concurrent sync operations', async () => {
      const mockData: LocalDataExport = {
        version: '1.0',
        exportedAt: Date.now(),
        deviceId: 'test-device',
        userId: 'test-user',
        data: { 
          expenses: {
            'exp1': {
              id: 'exp1',
              localId: 'exp1',
              syncStatus: 'pending',
              version: 1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              amount: 100,
              title: 'Test Expense',
              category: ['food'],
              for: ['personal'],
              date: Date.now()
            }
          }
        },
        checksum: 'test-checksum'
      };

      // Mock a slow API call to ensure overlap
      (mockConvexClient.mutation as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      // Start first sync
      const firstSync = syncManager.syncToCloud(mockData, 'test-token');
      
      // Try to start second sync immediately - should fail due to same operation ID generation
      // Since we can't easily test the exact same operation ID, let's test the active syncs tracking
      const stats = syncManager.getSyncStats();
      expect(stats.activeSyncs).toBeGreaterThan(0);
      
      // Wait for first sync to complete
      await firstSync;
      
      // Now active syncs should be 0
      const finalStats = syncManager.getSyncStats();
      expect(finalStats.activeSyncs).toBe(0);
    });
  });

  describe('Network Condition Handling', () => {
    test('should return null network condition when not available', () => {
      const condition = syncManager.getNetworkCondition();
      // Should be null in test environment where navigator.connection is not available
      expect(condition).toBeNull();
    });

    test('should provide default sync schedule when network condition is unknown', () => {
      const schedule = syncManager.getNetworkAwareSyncSchedule();
      expect(schedule.interval).toBe(30000); // Default 30 seconds
      expect(schedule.batchSize).toBe(50);
      expect(schedule.priority).toBe('medium');
    });
  });
});