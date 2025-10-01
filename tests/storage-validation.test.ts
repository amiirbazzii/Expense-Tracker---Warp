/**
 * Simple validation test for LocalStorageManager without complex setup
 */

// Mock localforage
const mockStorage = {
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
};

jest.mock('localforage', () => ({
  createInstance: jest.fn(() => mockStorage),
}));

import { LocalStorageManager } from '../src/lib/storage/LocalStorageManager';

describe('LocalStorageManager Implementation', () => {
  let manager: LocalStorageManager;

  beforeEach(() => {
    manager = new LocalStorageManager();
    jest.clearAllMocks();
  });

  describe('Missing Entity Operations', () => {
    it('should handle for values operations', async () => {
      const forValueData = { value: 'Test For Value' };
      
      const result = await manager.saveForValue(forValueData);
      
      expect(result.value).toBe('Test For Value');
      expect(result.syncStatus).toBe('pending');
      expect(result.version).toBe(1);
      expect(result.id).toBeDefined();
      expect(result.localId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle income categories operations', async () => {
      const categoryData = { name: 'Salary', type: 'income' as const };
      
      const result = await manager.saveIncomeCategory(categoryData);
      
      expect(result.name).toBe('Salary');
      expect(result.type).toBe('income');
      expect(result.syncStatus).toBe('pending');
      expect(result.version).toBe(1);
    });

    it('should update and delete for values', async () => {
      // Mock existing for value
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'forValues') {
          return Promise.resolve({
            'fv1': { 
              id: 'fv1', 
              value: 'Original Value', 
              syncStatus: 'synced', 
              version: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          });
        }
        return Promise.resolve({});
      });

      // Test update
      const updated = await manager.updateForValue('fv1', { value: 'Updated Value' });
      expect(updated?.value).toBe('Updated Value');
      expect(updated?.version).toBe(2);
      expect(updated?.syncStatus).toBe('pending');

      // Test delete
      const deleted = await manager.deleteForValue('fv1');
      expect(deleted).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate valid expense entity', async () => {
      const validExpense = {
        id: 'exp1',
        localId: 'local1',
        amount: 100,
        title: 'Test Expense',
        category: ['food'],
        for: ['personal'],
        date: Date.now(),
        syncStatus: 'pending' as const,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const result = await manager.validateEntity(validExpense, 'expenses');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid expense entity', async () => {
      const invalidExpense = {
        id: 'exp1',
        localId: 'local1',
        amount: -100, // Invalid negative amount
        title: '', // Empty title
        category: 'not-array', // Should be array
        for: [],
        date: 0, // Invalid date
        syncStatus: 'pending' as const,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any;

      const result = await manager.validateEntity(invalidExpense, 'expenses');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid amount'))).toBe(true);
      expect(result.errors.some(e => e.includes('Missing title'))).toBe(true);
    });

    it('should validate income entity', async () => {
      const validIncome = {
        id: 'inc1',
        localId: 'local1',
        amount: 1000,
        cardId: 'card1',
        date: Date.now(),
        source: 'Salary',
        category: 'work',
        syncStatus: 'pending' as const,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const result = await manager.validateEntity(validIncome, 'income');
      expect(result.isValid).toBe(true);
    });

    it('should repair corrupted entity', async () => {
      const corruptedEntity = {
        // Missing required fields
        amount: 'invalid',
        title: null,
      } as any;

      const repaired = (manager as any).attemptEntityRepair(corruptedEntity, 'expenses');
      
      expect(repaired).toBeTruthy();
      expect(repaired.id).toBeDefined();
      expect(repaired.localId).toBeDefined();
      expect(repaired.syncStatus).toBe('pending');
      expect(repaired.amount).toBe(0); // Repaired to valid value
      expect(repaired.title).toBe('Recovered Expense');
    });
  });

  describe('Storage Management', () => {
    it('should get storage info with fallback', async () => {
      // Mock keys for size estimation
      mockStorage.keys.mockResolvedValue(['expenses', 'income', 'metadata']);
      mockStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve({ [key]: 'test data' });
      });

      const info = await manager.getStorageInfo();
      
      expect(info.used).toBeGreaterThan(0);
      expect(info.available).toBeGreaterThan(0);
      expect(info.quota).toBeGreaterThan(0);
      expect(info.usagePercentage).toBeGreaterThanOrEqual(0);
    });

    it('should check storage health', async () => {
      const health = await manager.checkStorageHealth();
      
      expect(health.isHealthy).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
      expect(health.storageInfo).toBeDefined();
    });

    it('should cleanup old data', async () => {
      // Mock old data
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expenses') {
          return Promise.resolve({
            'old1': { id: 'old1', updatedAt: oldTimestamp, syncStatus: 'synced' },
            'new1': { id: 'new1', updatedAt: Date.now(), syncStatus: 'pending' }
          });
        }
        return Promise.resolve({});
      });

      const result = await manager.cleanupOldData({ maxAge: 90 * 24 * 60 * 60 * 1000 });
      
      expect(result.cleanedCount).toBeGreaterThanOrEqual(0);
      expect(result.freedSpace).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Atomic Operations', () => {
    it('should execute transaction successfully', async () => {
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ];

      const results = await manager.executeTransaction(operations);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should batch create expenses', async () => {
      const expensesData = [
        { amount: 100, title: 'Expense 1', category: ['food'], for: ['personal'], date: Date.now() },
        { amount: 200, title: 'Expense 2', category: ['transport'], for: ['work'], date: Date.now() }
      ];

      const results = await manager.batchCreateExpenses(expensesData);
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Expense 1');
      expect(results[1].title).toBe('Expense 2');
      expect(results[0].amount).toBe(100);
      expect(results[1].amount).toBe(200);
    });

    it('should create expense with dependencies', async () => {
      const expenseData = {
        amount: 50,
        title: 'Lunch',
        category: ['food'],
        for: ['personal'],
        date: Date.now()
      };

      const newCategories = [{ name: 'Fast Food', type: 'expense' as const }];
      const newForValues = [{ value: 'Lunch Break' }];

      const result = await manager.createExpenseWithDependencies(
        expenseData,
        newCategories,
        newForValues
      );

      expect(result.expense.title).toBe('Lunch');
      expect(result.categories).toHaveLength(1);
      expect(result.forValues).toHaveLength(1);
      expect(result.categories[0].name).toBe('Fast Food');
      expect(result.forValues[0].value).toBe('Lunch Break');
    });
  });

  describe('Search and Utility', () => {
    it('should search entities', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expenses') {
          return Promise.resolve({
            'exp1': { id: 'exp1', title: 'Coffee Shop', category: ['food'] },
            'exp2': { id: 'exp2', title: 'Gas Station', category: ['transport'] },
            'exp3': { id: 'exp3', title: 'Coffee Bean', category: ['food'] }
          });
        }
        return Promise.resolve({});
      });

      const results = await manager.searchEntities('expenses', 'coffee');
      
      expect(results).toHaveLength(2);
      expect(results.some((r: any) => r.title === 'Coffee Shop')).toBe(true);
      expect(results.some((r: any) => r.title === 'Coffee Bean')).toBe(true);
    });

    it('should get entity count', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expenses') {
          return Promise.resolve({
            'exp1': { id: 'exp1' },
            'exp2': { id: 'exp2' },
            'exp3': { id: 'exp3' }
          });
        }
        return Promise.resolve({});
      });

      const count = await manager.getEntityCount('expenses');
      expect(count).toBe(3);
    });

    it('should get total record count', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'expenses': return Promise.resolve({ 'exp1': {}, 'exp2': {} });
          case 'income': return Promise.resolve({ 'inc1': {} });
          case 'categories': return Promise.resolve({ 'cat1': {}, 'cat2': {}, 'cat3': {} });
          default: return Promise.resolve({});
        }
      });

      const total = await manager.getTotalRecordCount();
      expect(total).toBe(6); // 2 + 1 + 3 + 0 + 0 + 0
    });
  });
});