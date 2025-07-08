"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import localforage from "localforage";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthContext";

export type ExpenseStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface PendingExpense {
  id: string;
  amount: number;
  title: string;
  category: string[];
  for?: string;
  date: number;
  status: ExpenseStatus;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingExpenses: PendingExpense[];
  addPendingExpense: (expense: Omit<PendingExpense, 'id' | 'status'>) => Promise<void>;
  syncPendingExpenses: () => Promise<void>;
  retryFailedExpense: (expenseId: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const { token } = useAuth();

  const createExpenseMutation = useMutation(api.expenses.createExpense);

  useEffect(() => {
    // Configure localforage
    localforage.config({
      name: 'ExpenseTracker',
      storeName: 'pending_expenses',
      description: 'Queue for offline expense submissions',
    });

    // Load pending expenses from IndexedDB
    const loadPendingExpenses = async () => {
      try {
        const saved = await localforage.getItem<PendingExpense[]>('pending-expenses');
        if (saved) {
          setPendingExpenses(saved);
        }
      } catch (error) {
        console.error("Failed to load pending expenses from IndexedDB:", error);
      }
    };

    loadPendingExpenses();

    // Set up online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Note: Auto-sync is handled manually to avoid circular dependencies

  const addPendingExpense = async (expense: Omit<PendingExpense, 'id' | 'status'>) => {
    const newExpense: PendingExpense = {
      ...expense,
      id: Date.now().toString(),
      status: 'pending',
    };

    const updated = [...pendingExpenses, newExpense];
    setPendingExpenses(updated);
    try {
      await localforage.setItem('pending-expenses', updated);
    } catch (error) {
      console.error("Failed to save pending expense to IndexedDB:", error);
    }
  };

  const updateExpenseStatus = async (id: string, status: ExpenseStatus) => {
    const updatedExpenses = pendingExpenses.map(e => e.id === id ? { ...e, status } : e);
    setPendingExpenses(updatedExpenses);
    await localforage.setItem('pending-expenses', updatedExpenses);
  };

  const syncPendingExpenses = async () => {
    if (!token || !isOnline) return;

    const expensesToSync = pendingExpenses.filter(e => e.status === 'pending' || e.status === 'failed');
    if (expensesToSync.length === 0) return;

    for (const expense of expensesToSync) {
      await updateExpenseStatus(expense.id, 'syncing');
      try {
        await createExpenseMutation({
          token,
          amount: expense.amount,
          title: expense.title,
          category: expense.category,
          for: expense.for,
          date: expense.date,
        });
        // On success, remove it from the pending list
        const remainingExpenses = pendingExpenses.filter(e => e.id !== expense.id);
        setPendingExpenses(remainingExpenses);
        await localforage.setItem('pending-expenses', remainingExpenses);
      } catch (error) {
        console.error(`Failed to sync expense ${expense.id}:`, error);
        await updateExpenseStatus(expense.id, 'failed');
      }
    }
  };

  const retryFailedExpense = async (expenseId: string) => {
    const expense = pendingExpenses.find(e => e.id === expenseId);
    if (!expense || !token || !isOnline) return;

    await updateExpenseStatus(expense.id, 'syncing');
    try {
      await createExpenseMutation({
        token,
        amount: expense.amount,
        title: expense.title,
        category: expense.category,
        for: expense.for,
        date: expense.date,
      });
      const remainingExpenses = pendingExpenses.filter(e => e.id !== expense.id);
      setPendingExpenses(remainingExpenses);
      await localforage.setItem('pending-expenses', remainingExpenses);
    } catch (error) {
      console.error(`Failed to retry expense ${expense.id}:`, error);
      await updateExpenseStatus(expense.id, 'failed');
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingExpenses,
        addPendingExpense,
        syncPendingExpenses,
        retryFailedExpense,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
