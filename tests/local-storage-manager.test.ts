import { LocalStorageManager } from '../src/lib/storage/LocalStorageManager';
import { LocalExpense, LocalIncome, LocalCategory, LocalCard, LocalForValue } from '../src/lib/types/local-storage';

// Mock localforage
jest.mock('localforage', () => ({
  createInstance: jest.fn(() => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    keys: jest.fn(() => Promise.resolve([])),
  })),
}));

describe('LocalStorageManager', () => {
  let manager: LocalStorageManager;
  let mockStorage: any;

  beforeEach(() => {
    manager = new LocalStorageManager();
    // Get the mocked storage instance
    mockStorage = (manager as any).storage;
    
    // Setup default mock responses
    mockStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'metadata':
          return Promise.resolve({
            version: '2.0.0',
            deviceId: 'test-device',
            userId: 'test-user',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            schemaVersion: 2
          });
        case 'syncState':
          return Promise.resolve({
            lastSync: 0,
            pendingOperations: [],
            dataHash: '',
            conflictResolutions: [],
            totalRecords: 0,
            lastModified: Date.now()
          });
        default:
          return Promise.resolve({});
      }
    });
    
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(manager.initialize('test-user')).resolves.not.toThrow();
    });
  });

  describe('For Values Operations', () => {
    it('should save a for value', async () => {
      const forValueData = { value: 'Test For Value', cloudId: 'cloud-123' };
      
      const result = await manager.saveForValue(forValueData);
      
      expect(result).toMatchObject({
        value: 'Test For Value',
        cloudId: 'cloud-123',
        syncStatus: 'pending',
        version: 1
      });
      expect(result.id).toBeDefined();
      expect(result.localId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should get for values', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'forValues') {
          return Promise.resolve({
            'fv1': { id: 'fv1', value: 'Value A', syncStatus: 'synced' },
            'fv2': { id: 'fv2', value: 'Value B', syncStatus: 'pending' }
          });
        }
        return Promise.resolve({});
      });

      const forValues = await manager.getForValues();
      
      expect(forValues).toHaveLength(2);
      expect(forValues[0].value).toBe('Value A');
      expect(forValues[1].value).toBe('Value B');
    });

    it('should update a for value', async () => {
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

      const result = await manager.updateForValue('fv1', { value: 'Updated Value' });
      
      expect(result).toMatchObject({
        id: 'fv1',
        value: 'Updated Value',
        syncStatus: 'pending',
        version: 2
      });
    });

    it('should delete a for value', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'forValues') {
          return Promise.resolve({
            'fv1': { id: 'fv1', value: 'Value to Delete' }
          });
        }
        return Promise.resolve({});
      });

      const result = await manager.deleteForValue('fv1');
      
      expect(result).toBe(true);
    });
  });

  describe('Income Categories Operations', () => {
    it('should save an income category', async () => {
      const categoryData = { name: 'Salary', type: 'income' as const, cloudId: 'cloud-cat-123' };
      
      const result = await manager.saveIncomeCategory(categoryData);
      
      expect(result).toMatchObject({
        name: 'Salary',
        type: 'income',
        cloudId: 'cloud-cat-123',
        syncStatus: 'pending',
        version: 1
      });
    });

    it('should get income categories', async () => {
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'incomeCategories') {
          return Promise.resolve({
            'ic1': { id: 'ic1', name: 'Salary', type: 'income' },
            'ic2': { id: 'ic2', name: 'Freelance', type: 'income' }
          });
        }
        return Promise.resolve({});
      });

      const categories = await manager.getIncomeCategories();
      
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Freelance'); // Sorted alphabetically
      expect(categories[1].name).toBe('Salary');
    });
  });

  describe('Data Validation', () => {
    it('should validate expense entity correctly', async () => {
      const validExpense: LocalExpense = {
        id: 'exp1',
        localId: 'local1',
        amount: 100,
        title: 'Test Expense',
        category: ['food'],
        for: ['personal'],
        date: Date.now(),
        syncStatus: 'pending',
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
        syncStatus: 'pending',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any;

      const result = await manager.validateEntity(invalidExpense, 'expenses');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Management', () => {
    it('should get storage info', async () => {
      // Mock navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 1000000,
            usage: 500000
          })
        },
        configurable: true
      });

      const info = await manager.getStorageInfo();
      
      expect(info.quota).toBe(1000000);
      expect(info.used).toBe(500000);
      expect(info.available).toBe(500000);
      expect(info.usagePercentage).toBe(50);
    });

    it('should check storage health', async () => {
      // Mock storage estimate
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 1000000,
            usage: 100000 // 10% usage
          })
        },
        configurable: true
      });

      const health = await manager.checkStorageHealth();
      
      expect(health.isHealthy).toBeDefined();
      expect(health.issues).toBeDefined();
      expect(health.recommendations).toBeDefined();
      expect(health.storageInfo).toBeDefined();
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

    it('should rollback on transaction failure', async () => {
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.reject(new Error('Operation failed')),
        () => Promise.resolve('result3')
      ];

      await expect(manager.executeTransaction(operations)).rejects.toThrow('Operation failed');
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
    });
  });

  describe('Search Functionality', () => {
    it('should search entities by term', async () => {
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
      expect(results.some(r => r.title === 'Coffee Shop')).toBe(true);
      expect(results.some(r => r.title === 'Coffee Bean')).toBe(true);
    });
  });
});