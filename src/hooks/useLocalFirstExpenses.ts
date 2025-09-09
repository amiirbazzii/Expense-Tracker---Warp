"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalExpense, DataFilters, SyncStatus } from '@/lib/types/local-storage';
import { useLocalFirst } from './useLocalFirst';
import { useOfflineQueue } from './useOfflineQueue';

export interface ExpenseFormData {
  amount: number;
  title: string;
  category: string[];
  date: number;
  cardId: string;
  forValue: string;
  description?: string;
}

export interface UseLocalFirstExpensesReturn {
  // Data
  expenses: LocalExpense[];
  isLoading: boolean;
  
  // Operations
  createExpense: (data: ExpenseFormData) => Promise<LocalExpense>;
  updateExpense: (id: string, updates: Partial<ExpenseFormData>) => Promise<LocalExpense | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  
  // State
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncTime: Date | null;
  
  // Utilities
  refreshData: () => Promise<void>;
  exportExpenses: () => Promise<LocalExpense[]>;
}

export function useLocalFirstExpenses(filters?: DataFilters): UseLocalFirstExpensesReturn {
  const { localStorageManager, isOnline, isInitialized } = useLocalFirst();
  const { addOperation } = useOfflineQueue();
  
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load expenses from local storage
  const loadExpenses = useCallback(async () => {
    if (!isInitialized || !localStorageManager) return;
    
    try {
      const localExpenses = await localStorageManager.getExpenses(filters);
      setExpenses(localExpenses);
      
      // Calculate pending count
      const pending = localExpenses.filter(exp => exp.syncStatus === 'pending').length;
      setPendingCount(pending);
      
      // Update sync status based on pending operations
      setSyncStatus(pending > 0 ? 'pending' : 'synced');
      
      // Get last sync time from sync state
      const syncState = await localStorageManager.getSyncState();
      if (syncState?.lastSync) {
        setLastSyncTime(new Date(syncState.lastSync));
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [localStorageManager, isInitialized, filters]);

  // Initial load and refresh on dependency changes
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Create new expense
  const createExpense = useCallback(async (data: ExpenseFormData): Promise<LocalExpense> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      // Save locally first (optimistic update)
      const newExpense = await localStorageManager.saveExpense({
        ...data,
        cloudId: undefined
      });

      // Update state immediately
      setExpenses(prev => [newExpense, ...prev]);
      setPendingCount(prev => prev + 1);
      setSyncStatus('pending');

      // Queue for sync if online
      if (isOnline) {
        await addOperation({
          id: `create_expense_${newExpense.id}`,
          type: 'create',
          entityType: 'expenses',
          entityId: newExpense.id,
          data: newExpense,
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3
        });
      }

      return newExpense;
    } catch (error) {
      console.error('Failed to create expense:', error);
      throw error;
    }
  }, [localStorageManager, isOnline, addOperation]);

  // Update existing expense
  const updateExpense = useCallback(async (
    id: string, 
    updates: Partial<ExpenseFormData>
  ): Promise<LocalExpense | null> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      // Update locally first
      const updatedExpense = await localStorageManager.updateExpense(id, updates);
      
      if (!updatedExpense) {
        return null;
      }

      // Update state immediately
      setExpenses(prev => 
        prev.map(exp => exp.id === id ? updatedExpense : exp)
      );

      // Only increment pending if this expense wasn't already pending
      const existingExpense = expenses.find(exp => exp.id === id);
      if (existingExpense?.syncStatus !== 'pending') {
        setPendingCount(prev => prev + 1);
        setSyncStatus('pending');
      }

      // Queue for sync if online
      if (isOnline) {
        await addOperation({
          id: `update_expense_${id}`,
          type: 'update',
          entityType: 'expenses',
          entityId: id,
          data: updatedExpense,
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3
        });
      }

      return updatedExpense;
    } catch (error) {
      console.error('Failed to update expense:', error);
      throw error;
    }
  }, [localStorageManager, isOnline, addOperation, expenses]);

  // Delete expense
  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      // Delete locally first
      const success = await localStorageManager.deleteExpense(id);
      
      if (!success) {
        return false;
      }

      // Update state immediately
      const expenseToDelete = expenses.find(exp => exp.id === id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));

      // Adjust pending count
      if (expenseToDelete?.syncStatus === 'pending') {
        setPendingCount(prev => Math.max(0, prev - 1));
      }

      // Queue for sync if online and expense was previously synced
      if (isOnline && expenseToDelete?.cloudId) {
        await addOperation({
          id: `delete_expense_${id}`,
          type: 'delete',
          entityType: 'expenses',
          entityId: id,
          data: { cloudId: expenseToDelete.cloudId },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to delete expense:', error);
      throw error;
    }
  }, [localStorageManager, isOnline, addOperation, expenses]);

  // Refresh data from storage
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await loadExpenses();
  }, [loadExpenses]);

  // Export expenses for backup
  const exportExpenses = useCallback(async (): Promise<LocalExpense[]> => {
    if (!localStorageManager) {
      return [];
    }

    try {
      return await localStorageManager.getExpenses();
    } catch (error) {
      console.error('Failed to export expenses:', error);
      return [];
    }
  }, [localStorageManager]);

  // Memoized return value to prevent unnecessary re-renders
  const returnValue = useMemo((): UseLocalFirstExpensesReturn => ({
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    syncStatus,
    pendingCount,
    lastSyncTime,
    refreshData,
    exportExpenses
  }), [
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    syncStatus,
    pendingCount,
    lastSyncTime,
    refreshData,
    exportExpenses
  ]);

  return returnValue;
}

// Hook for expense statistics and aggregations
export function useExpenseStatistics(expenses: LocalExpense[]) {
  return useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;
    
    // Group by category
    const byCategory = expenses.reduce((acc, expense) => {
      expense.category.forEach(cat => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {} as Record<string, number>);
    
    // Group by card
    const byCard = expenses.reduce((acc, expense) => {
      acc[expense.cardId] = (acc[expense.cardId] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Monthly totals
    const monthlyTotals = expenses.reduce((acc, expense) => {
      const monthKey = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM
      acc[monthKey] = (acc[monthKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalAmount,
      expenseCount,
      averageAmount: expenseCount > 0 ? totalAmount / expenseCount : 0,
      byCategory,
      byCard,
      monthlyTotals
    };
  }, [expenses]);
}

// Hook for filtered expenses with search and category filtering
export function useFilteredExpenses(
  expenses: LocalExpense[], 
  searchTerm?: string, 
  categories?: string[]
) {
  return useMemo(() => {
    let filtered = expenses;
    
    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.title.toLowerCase().includes(term) ||
        expense.description?.toLowerCase().includes(term) ||
        expense.category.some(cat => cat.toLowerCase().includes(term))
      );
    }
    
    // Apply category filter
    if (categories && categories.length > 0) {
      filtered = filtered.filter(expense =>
        expense.category.some(cat => categories.includes(cat))
      );
    }
    
    return filtered;
  }, [expenses, searchTerm, categories]);
}