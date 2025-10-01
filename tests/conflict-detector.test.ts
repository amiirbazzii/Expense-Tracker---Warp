import { ConflictDetector } from '../src/lib/sync/ConflictDetector';
import { 
  LocalDataExport, 
  CloudDataMapping, 
  LocalExpense,
  ConflictResolutionStrategy,
  ConflictResolution
} from '../src/lib/types/local-storage';

describe('Enhanced ConflictDetector', () => {
  let conflictDetector: ConflictDetector;

  beforeEach(() => {
    conflictDetector = new ConflictDetector();
  });

  describe('CRDT-like Merge Strategies', () => {
    it('should merge arrays using set union', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee',
        category: ['food', 'drinks'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Coffee',
        category: ['food', 'beverages', 'cafe'],
        for: ['personal', 'work'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 1800000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      // Arrays should be merged using set union
      expect(result.resolved.category).toEqual(
        expect.arrayContaining(['food', 'drinks', 'beverages', 'cafe'])
      );
      expect(result.resolved.for).toEqual(
        expect.arrayContaining(['personal', 'work'])
      );
    });

    it('should use last-writer-wins for simple fields', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 1800000, // Newer than cloud
        amount: 27.00,
        title: 'Updated Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000 // Older than local
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      // Local version should win due to newer timestamp
      expect(result.resolved.amount).toBe(27.00);
      expect(result.resolved.title).toBe('Updated Coffee');
    });

    it('should handle numeric max strategy', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 30.00, // Higher amount
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      // Should use the higher amount
      expect(result.resolved.amount).toBe(30.00);
    });
  });

  describe('Field-Level Conflict Detection', () => {
    it('should detect array differences', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee',
        category: ['food', 'drinks'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Coffee',
        category: ['food', 'beverages'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      const categoryConflict = result.conflicts.find(c => c.field === 'category');
      expect(categoryConflict).toBeDefined();
      expect(categoryConflict?.conflictType).toBe('array_difference');
      expect(categoryConflict?.autoResolvable).toBe(true);
    });

    it('should detect numeric differences', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 30.00,
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      const amountConflict = result.conflicts.find(c => c.field === 'amount');
      expect(amountConflict).toBeDefined();
      expect(amountConflict?.conflictType).toBe('numeric_difference');
      expect(amountConflict?.autoResolvable).toBe(true);
    });

    it('should detect string differences', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee Shop',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Cafe Visit',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      const titleConflict = result.conflicts.find(c => c.field === 'title');
      expect(titleConflict).toBeDefined();
      expect(titleConflict?.conflictType).toBe('string_difference');
    });
  });

  describe('Conflict History and Audit Trail', () => {
    it('should add resolutions to history', () => {
      const resolution: ConflictResolution = {
        id: 'resolution_1',
        entityType: 'expenses',
        entityId: 'expense_1',
        resolvedAt: Date.now(),
        strategy: 'merge',
        note: 'Test resolution'
      };

      conflictDetector.addToHistory(resolution);
      const history = conflictDetector.getConflictHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(resolution);
    });

    it('should filter history by entity type', () => {
      const expenseResolution: ConflictResolution = {
        id: 'resolution_1',
        entityType: 'expenses',
        entityId: 'expense_1',
        resolvedAt: Date.now(),
        strategy: 'merge',
        note: 'Expense resolution'
      };

      const incomeResolution: ConflictResolution = {
        id: 'resolution_2',
        entityType: 'income',
        entityId: 'income_1',
        resolvedAt: Date.now(),
        strategy: 'local_wins',
        note: 'Income resolution'
      };

      conflictDetector.addToHistory(expenseResolution);
      conflictDetector.addToHistory(incomeResolution);

      const expenseHistory = conflictDetector.getConflictHistory('expenses');
      const incomeHistory = conflictDetector.getConflictHistory('income');

      expect(expenseHistory).toHaveLength(1);
      expect(expenseHistory[0].entityType).toBe('expenses');
      expect(incomeHistory).toHaveLength(1);
      expect(incomeHistory[0].entityType).toBe('income');
    });

    it('should generate conflict statistics', () => {
      const resolutions: ConflictResolution[] = [
        {
          id: 'resolution_1',
          entityType: 'expenses',
          entityId: 'expense_1',
          resolvedAt: Date.now(),
          strategy: 'merge',
          note: 'Test 1'
        },
        {
          id: 'resolution_2',
          entityType: 'expenses',
          entityId: 'expense_2',
          resolvedAt: Date.now(),
          strategy: 'local_wins',
          note: 'Test 2'
        },
        {
          id: 'resolution_3',
          entityType: 'income',
          entityId: 'income_1',
          resolvedAt: Date.now(),
          strategy: 'merge',
          note: 'Test 3'
        }
      ];

      resolutions.forEach(resolution => {
        conflictDetector.addToHistory(resolution);
      });

      const stats = conflictDetector.getConflictStats();

      expect(stats.total).toBe(3);
      expect(stats.byStrategy.merge).toBe(2);
      expect(stats.byStrategy.local_wins).toBe(1);
      expect(stats.byEntityType.expenses).toBe(2);
      expect(stats.byEntityType.income).toBe(1);
    });

    it('should export and import history', () => {
      const resolution: ConflictResolution = {
        id: 'resolution_1',
        entityType: 'expenses',
        entityId: 'expense_1',
        resolvedAt: Date.now(),
        strategy: 'merge',
        note: 'Test resolution'
      };

      conflictDetector.addToHistory(resolution);
      const exported = conflictDetector.exportHistory();
      
      conflictDetector.clearHistory();
      expect(conflictDetector.getConflictHistory()).toHaveLength(0);
      
      conflictDetector.importHistory(exported);
      const imported = conflictDetector.getConflictHistory();
      
      expect(imported).toHaveLength(1);
      expect(imported[0]).toEqual(resolution);
    });

    it('should limit history size to prevent memory issues', () => {
      // Add more than 1000 resolutions
      for (let i = 0; i < 1100; i++) {
        const resolution: ConflictResolution = {
          id: `resolution_${i}`,
          entityType: 'expenses',
          entityId: `expense_${i}`,
          resolvedAt: Date.now() + i,
          strategy: 'merge',
          note: `Test resolution ${i}`
        };
        conflictDetector.addToHistory(resolution);
      }

      const history = conflictDetector.getConflictHistory();
      expect(history).toHaveLength(1000);
      
      // Should keep the most recent 1000
      expect(history[0].id).toBe('resolution_1099');
      expect(history[999].id).toBe('resolution_100');
    });
  });

  describe('Auto-Resolution Detection', () => {
    it('should identify auto-resolvable conflicts', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Coffee',
        category: ['food', 'beverages'], // Array difference - auto-resolvable
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      const categoryConflict = result.conflicts.find(c => c.field === 'category');
      expect(categoryConflict?.autoResolvable).toBe(true);
    });

    it('should identify non-auto-resolvable conflicts', async () => {
      const localExpense: LocalExpense = {
        id: 'expense_1',
        localId: 'local_1',
        cloudId: 'expense_1',
        syncStatus: 'conflict',
        version: 1,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
        amount: 25.50,
        title: 'Coffee Shop',
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000
      };

      const cloudExpense = {
        _id: 'expense_1',
        amount: 25.50,
        title: 'Cafe Visit', // String difference with similar timestamps - not auto-resolvable
        category: ['food'],
        for: ['personal'],
        date: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000 // Same timestamp as local
      };

      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: false,
        preserveDeleted: true,
        mergeRules: []
      };

      const result = await conflictDetector.resolveFieldLevelConflicts(
        localExpense,
        cloudExpense,
        strategy
      );

      const titleConflict = result.conflicts.find(c => c.field === 'title');
      expect(titleConflict?.autoResolvable).toBe(false);
    });
  });
});