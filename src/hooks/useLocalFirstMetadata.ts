"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocalIncome, LocalCategory, LocalCard, LocalForValue } from '@/lib/types/local-storage';
import { useLocalFirst } from './useLocalFirst';

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
  const { localStorageManager, isInitialized } = useLocalFirst();
  
  const [income, setIncome] = useState<LocalIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadIncome = useCallback(async () => {
    if (!isInitialized || !localStorageManager) return;
    
    try {
      const localIncome = await localStorageManager.getIncome();
      setIncome(localIncome);
    } catch (error) {
      console.error('Failed to load income:', error);
    } finally {
      setIsLoading(false);
    }
  }, [localStorageManager, isInitialized]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  const createIncome = useCallback(async (data: IncomeFormData): Promise<LocalIncome> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      const newIncome = await localStorageManager.saveIncome({
        ...data,
        cloudId: undefined
      });

      setIncome(prev => [newIncome, ...prev]);
      return newIncome;
    } catch (error) {
      console.error('Failed to create income:', error);
      throw error;
    }
  }, [localStorageManager]);

  const updateIncome = useCallback(async (
    id: string, 
    updates: Partial<IncomeFormData>
  ): Promise<LocalIncome | null> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      const updatedIncome = await localStorageManager.updateIncome(id, updates);
      
      if (!updatedIncome) return null;

      setIncome(prev => 
        prev.map(inc => inc.id === id ? updatedIncome : inc)
      );

      return updatedIncome;
    } catch (error) {
      console.error('Failed to update income:', error);
      throw error;
    }
  }, [localStorageManager]);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      const success = await localStorageManager.deleteIncome(id);
      
      if (success) {
        setIncome(prev => prev.filter(inc => inc.id !== id));
      }

      return success;
    } catch (error) {
      console.error('Failed to delete income:', error);
      throw error;
    }
  }, [localStorageManager]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await loadIncome();
  }, [loadIncome]);

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
  const { localStorageManager, isInitialized } = useLocalFirst();
  
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    if (!isInitialized || !localStorageManager) return;
    
    try {
      const localCategories = await localStorageManager.getCategories();
      setCategories(localCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [localStorageManager, isInitialized]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(async (data: {
    name: string;
    type: 'expense' | 'income';
    color?: string;
    icon?: string;
  }): Promise<LocalCategory> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      const newCategory = await localStorageManager.saveCategory({
        ...data,
        cloudId: undefined
      });

      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }, [localStorageManager]);

  const getExpenseCategories = useMemo(() => 
    categories.filter(cat => cat.type === 'expense'),
    [categories]
  );

  const getIncomeCategories = useMemo(() => 
    categories.filter(cat => cat.type === 'income'),
    [categories]
  );

  return {
    categories,
    expenseCategories: getExpenseCategories,
    incomeCategories: getIncomeCategories,
    isLoading,
    createCategory,
    refreshData: loadCategories
  };
}

// Hook for managing cards
export function useLocalFirstCards() {
  const { localStorageManager, isInitialized } = useLocalFirst();
  
  const [cards, setCards] = useState<LocalCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!isInitialized || !localStorageManager) return;
    
    try {
      const localCards = await localStorageManager.getCards();
      setCards(localCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [localStorageManager, isInitialized]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const createCard = useCallback(async (data: {
    name: string;
    type: string;
    balance?: number;
    color?: string;
  }): Promise<LocalCard> => {
    if (!localStorageManager) {
      throw new Error('Storage not initialized');
    }

    try {
      const newCard = await localStorageManager.saveCard({
        ...data,
        balance: data.balance || 0,
        cloudId: undefined
      });

      setCards(prev => [...prev, newCard].sort((a, b) => a.name.localeCompare(b.name)));
      return newCard;
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }, [localStorageManager]);

  return {
    cards,
    isLoading,
    createCard,
    refreshData: loadCards
  };
}

// Hook for metadata that combines all reference data
export function useLocalFirstMetadata() {
  const { categories, expenseCategories, incomeCategories, isLoading: categoriesLoading } = useLocalFirstCategories();
  const { cards, isLoading: cardsLoading } = useLocalFirstCards();
  
  // For values are typically static but could be made dynamic
  const forValues: LocalForValue[] = useMemo(() => [
    { id: '1', name: 'Personal', type: 'personal' },
    { id: '2', name: 'Family', type: 'family' },
    { id: '3', name: 'Business', type: 'business' },
    { id: '4', name: 'Investment', type: 'investment' },
    { id: '5', name: 'Emergency', type: 'emergency' }
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
    
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });

    const monthlyIncome = income.filter(inc => {
      const incomeDate = new Date(inc.date);
      return incomeDate.getMonth() === currentMonth && 
             incomeDate.getFullYear() === currentYear;
    });

    const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = monthlyIncome.reduce((sum, inc) => sum + inc.amount, 0);

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
    const categoryBreakdown = monthlyData.expenses.reduce((acc, expense) => {
      expense.category.forEach(cat => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {} as Record<string, number>);

    // Daily spending for bar chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExpenses = expenses.filter(expense => expense.date >= thirtyDaysAgo.getTime());
    
    const dailySpending = recentExpenses.reduce((acc, expense) => {
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