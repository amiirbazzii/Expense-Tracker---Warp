import { LocalStorageManager } from '../src/lib/storage/LocalStorageManager';

// Mock localforage
jest.mock('localforage', () => ({
  createInstance: jest.fn(() => ({
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
  })),
}));

describe('LocalStorageManager Basic Tests', () => {
  let manager: LocalStorageManager;

  beforeEach(() => {
    manager = new LocalStorageManager();
  });

  it('should create an instance', () => {
    expect(manager).toBeInstanceOf(LocalStorageManager);
  });

  it('should initialize successfully', async () => {
    await expect(manager.initialize('test-user')).resolves.not.toThrow();
  });

  it('should save and validate a for value', async () => {
    const forValueData = { value: 'Test For Value' };
    
    const result = await manager.saveForValue(forValueData);
    
    expect(result.value).toBe('Test For Value');
    expect(result.syncStatus).toBe('pending');
    expect(result.version).toBe(1);
    expect(result.id).toBeDefined();
    expect(result.localId).toBeDefined();
  });

  it('should save an income category', async () => {
    const categoryData = { name: 'Salary', type: 'income' as const };
    
    const result = await manager.saveIncomeCategory(categoryData);
    
    expect(result.name).toBe('Salary');
    expect(result.type).toBe('income');
    expect(result.syncStatus).toBe('pending');
  });

  it('should validate entity correctly', async () => {
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

  it('should detect invalid entity', async () => {
    const invalidExpense = {
      id: 'exp1',
      localId: 'local1',
      amount: -100, // Invalid
      title: '', // Invalid
      category: 'not-array', // Invalid
      for: [],
      date: 0, // Invalid
      syncStatus: 'pending' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as any;

    const result = await manager.validateEntity(invalidExpense, 'expenses');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});