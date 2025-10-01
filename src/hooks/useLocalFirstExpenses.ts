"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalExpense, DataFilters, SyncStatus } from '../lib/types/local-storage';
import { useExpenses } from './useLocalFirst';
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
  // Use the existing useExpenses hook from useLocalFirst
  const expensesResult = useExpenses(filters);
  const { addToQueue } = useOfflineQueue('expense-operations');

  // Track online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use data from the useExpenses hook
  const expenses = expensesResult.data;
  const isLoading = expensesResult.isLoading;
  const syncStatus = expensesResult.syncStatus;
  const pendingCount = expensesResult.pendingCount;
  const lastSyncTime = expensesResult.lastSyncedAt;

  // Create new expense
  const createExpense = useCallback(async (data: ExpenseFormData): Promise<LocalExpense> => {
    try {
      // Convert ExpenseFormData to the format expected by useExpenses
      const expenseData = {
        amount: data.amount,
        title: data.title,
        category: data.category,
        for: [data.forValue], // Convert single forValue to array
        date: data.date,
        cardId: data.cardId
      };

      const newExpense = await expensesResult.createExpense(expenseData);

      // Queue for sync if online
      if (isOnline) {
        addToQueue({
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
  }, [expensesResult.createExpense, isOnline, addToQueue]);

  // Update existing expense
  const updateExpense = useCallback(async (
    id: string,
    updates: Partial<ExpenseFormData>
  ): Promise<LocalExpense | null> => {
    try {
      // Convert ExpenseFormData updates to the format expected by useExpenses
      const expenseUpdates: Partial<LocalExpense> = {};

      if (updates.amount !== undefined) expenseUpdates.amount = updates.amount;
      if (updates.title !== undefined) expenseUpdates.title = updates.title;
      if (updates.category !== undefined) expenseUpdates.category = updates.category;
      if (updates.forValue !== undefined) expenseUpdates.for = [updates.forValue];
      if (updates.date !== undefined) expenseUpdates.date = updates.date;
      if (updates.cardId !== undefined) expenseUpdates.cardId = updates.cardId;

      const updatedExpense = await expensesResult.updateExpense(id, expenseUpdates);

      if (!updatedExpense) {
        return null;
      }

      // Queue for sync if online
      if (isOnline) {
        addToQueue({
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
  }, [expensesResult.updateExpense, isOnline, addToQueue]);

  // Delete expense
  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Find the expense before deletion for sync queue
      const expenseToDelete = expenses.find(exp => exp.id === id);

      const success = await expensesResult.deleteExpense(id);

      if (!success) {
        return false;
      }

      // Queue for sync if online and expense was previously synced
      if (isOnline && expenseToDelete?.cloudId) {
        addToQueue({
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
  }, [expensesResult.deleteExpense, isOnline, addToQueue, expenses]);

  // Refresh data from storage
  const refreshData = useCallback(async () => {
    await expensesResult.refreshData();
  }, [expensesResult.refreshData]);

  // Export expenses for backup
  const exportExpenses = useCallback(async (): Promise<LocalExpense[]> => {
    try {
      return expenses;
    } catch (error) {
      console.error('Failed to export expenses:', error);
      return [];
    }
  }, [expenses]);

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
      if (expense.cardId) {
        acc[expense.cardId] = (acc[expense.cardId] || 0) + expense.amount;
      }
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
        expense.category.some(cat => cat.toLowerCase().includes(term)) ||
        expense.for.some(forValue => forValue.toLowerCase().includes(term))
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