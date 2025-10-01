"use client";

import { useCallback, useMemo } from 'react';
import { LocalIncome, LocalCategory, LocalCard, LocalForValue, LocalExpense } from '@/lib/types/local-storage';
import { useIncome, useCategories, useCards } from './useLocalFirst';
import { useLocalFirstExpenses } from './useLocalFirstExpenses';

export interface IncomeFormData {
  amount: number;
  title: string;
  category: string[];
  date: number;
  cardId: string;
  forValue: string;
  description?: string;
}

export interface UseLocalFirstIncomeReturn {
  income: LocalIncome[];
  isLoading: boolean;
  createIncome: (data: IncomeFormData) => Promise<LocalIncome>;
  updateIncome: (id: string, updates: Partial<IncomeFormData>) => Promise<LocalIncome | null>;
  deleteIncome: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

export function useLocalFirstIncome(): UseLocalFirstIncomeReturn {
  const incomeResult = useIncome();

  const income = incomeResult.data;
  const isLoading = incomeResult.isLoading;

  const createIncome = useCallback(async (data: IncomeFormData): Promise<LocalIncome> => {
    try {
      const incomeData = {
        amount: data.amount,
        cardId: data.cardId,
        date: data.date,
        source: data.title,
        category: data.category[0] || '',
        notes: data.description
      };

      return await incomeResult.createIncome(incomeData);
    } catch (error) {
      console.error('Failed to create income:', error);
      throw error;
    }
  }, [incomeResult.createIncome]);

  const updateIncome = useCallback(async (
    id: string,
    updates: Partial<IncomeFormData>
  ): Promise<LocalIncome | null> => {
    try {
      const incomeUpdates: Partial<LocalIncome> = {};

      if (updates.amount !== undefined) incomeUpdates.amount = updates.amount;
      if (updates.cardId !== undefined) incomeUpdates.cardId = updates.cardId;
      if (updates.date !== undefined) incomeUpdates.date = updates.date;
      if (updates.title !== undefined) incomeUpdates.source = updates.title;
      if (updates.category !== undefined) incomeUpdates.category = updates.category[0] || '';
      if (updates.description !== undefined) incomeUpdates.notes = updates.description;

      return await incomeResult.updateIncome(id, incomeUpdates);
    } catch (error) {
      console.error('Failed to update income:', error);
      throw error;
    }
  }, [incomeResult.updateIncome]);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await incomeResult.deleteIncome(id);
    } catch (error) {
      console.error('Failed to delete income:', error);
      throw error;
    }
  }, [incomeResult.deleteIncome]);

  const refreshData = useCallback(async () => {
    await incomeResult.refreshData();
  }, [incomeResult.refreshData]);

  return useMemo(() => ({
    income,
    isLoading,
    createIncome,
    updateIncome,
    deleteIncome,
    refreshData
  }), [income, isLoading, createIncome, updateIncome, deleteIncome, refreshData]);
}

// Hook for managing categories
export function useLocalFirstCategories() {
  const categoriesResult = useCategories();

  const categories = categoriesResult.data;
  const isLoading = categoriesResult.isLoading;

  const createCategory = useCallback(async (data: {
    name: string;
    type: 'expense' | 'income';
    color?: string;
    icon?: string;
  }): Promise<LocalCategory> => {
    try {
      return await categoriesResult.createCategory({
        name: data.name,
        type: data.type
      });
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }, [categoriesResult.createCategory]);

  const getExpenseCategories = useMemo(() =>
    categories.filter((cat: LocalCategory) => cat.type === 'expense'),
    [categories]
  );

  const getIncomeCategories = useMemo(() =>
    categories.filter((cat: LocalCategory) => cat.type === 'income'),
    [categories]
  );

  const refreshData = useCallback(async () => {
    // The useCategories hook handles data refreshing internally
  }, []);

  return {
    categories,
    expenseCategories: getExpenseCategories,
    incomeCategories: getIncomeCategories,
    isLoading,
    createCategory,
    refreshData
  };
}

// Hook for managing cards
export function useLocalFirstCards() {
  const cardsResult = useCards();

  const cards = cardsResult.data;
  const isLoading = cardsResult.isLoading;

  const createCard = useCallback(async (data: {
    name: string;
    type: string;
    balance?: number;
    color?: string;
  }): Promise<LocalCard> => {
    try {
      return await cardsResult.createCard({
        name: data.name
      });
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }, [cardsResult.createCard]);

  const refreshData = useCallback(async () => {
    // The useCards hook handles data refreshing internally
  }, []);

  return {
    cards,
    isLoading,
    createCard,
    refreshData
  };
}

// Hook for metadata that combines all reference data
export function useLocalFirstMetadata() {
  const { categories, expenseCategories, incomeCategories, isLoading: categoriesLoading } = useLocalFirstCategories();
  const { cards, isLoading: cardsLoading } = useLocalFirstCards();

  // For values are typically static but could be made dynamic
  const forValues: LocalForValue[] = useMemo(() => [
    {
      id: '1',
      localId: 'local_1',
      value: 'Personal',
      syncStatus: 'synced' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: '2',
      localId: 'local_2',
      value: 'Family',
      syncStatus: 'synced' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: '3',
      localId: 'local_3',
      value: 'Business',
      syncStatus: 'synced' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: '4',
      localId: 'local_4',
      value: 'Investment',
      syncStatus: 'synced' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: '5',
      localId: 'local_5',
      value: 'Emergency',
      syncStatus: 'synced' as const,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ], []);

  const isLoading = categoriesLoading || cardsLoading;

  return {
    categories,
    expenseCategories,
    incomeCategories,
    cards,
    forValues,
    isLoading
  };
}

// Hook for dashboard-specific data aggregation
export function useLocalFirstDashboard() {
  const { expenses } = useLocalFirstExpenses();
  const { income } = useLocalFirstIncome();
  const { cards } = useLocalFirstCards();
  const { categories } = useLocalFirstCategories();

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = expenses.filter((expense: LocalExpense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear;
    });

    const monthlyIncome = income.filter((inc: LocalIncome) => {
      const incomeDate = new Date(inc.date);
      return incomeDate.getMonth() === currentMonth &&
        incomeDate.getFullYear() === currentYear;
    });

    const totalExpenses = monthlyExpenses.reduce((sum: number, exp: LocalExpense) => sum + exp.amount, 0);
    const totalIncome = monthlyIncome.reduce((sum: number, inc: LocalIncome) => sum + inc.amount, 0);

    return {
      expenses: monthlyExpenses,
      income: monthlyIncome,
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      expenseCount: monthlyExpenses.length,
      incomeCount: monthlyIncome.length
    };
  }, [expenses, income]);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Category breakdown for pie chart
    const categoryBreakdown = monthlyData.expenses.reduce((acc: Record<string, number>, expense: LocalExpense) => {
      expense.category.forEach((cat: string) => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {} as Record<string, number>);

    // Daily spending for bar chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExpenses = expenses.filter((expense: LocalExpense) => expense.date >= thirtyDaysAgo.getTime());

    const dailySpending = recentExpenses.reduce((acc: Record<string, number>, expense: LocalExpense) => {
      const day = new Date(expense.date).toISOString().split('T')[0]; // YYYY-MM-DD
      acc[day] = (acc[day] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      categoryBreakdown,
      dailySpending
    };
  }, [monthlyData.expenses, expenses]);

  const isLoading = false; // Local data loads instantly

  return {
    monthlyData,
    chartData,
    cards,
    categories,
    isLoading
  };
}