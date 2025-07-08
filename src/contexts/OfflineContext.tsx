"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthContext";

interface PendingExpense {
  id: string;
  amount: number;
  title: string;
  category: string[];
  for?: string;
  date: number;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingExpenses: PendingExpense[];
  addPendingExpense: (expense: Omit<PendingExpense, "id">) => void;
  syncPendingExpenses: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const { token } = useAuth();

  const createExpenseMutation = useMutation(api.expenses.createExpense);

  useEffect(() => {
    // Load pending expenses from localStorage
    const saved = localStorage.getItem("pending-expenses");
    if (saved) {
      setPendingExpenses(JSON.parse(saved));
    }

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

  const addPendingExpense = (expense: Omit<PendingExpense, "id">) => {
    const newExpense: PendingExpense = {
      ...expense,
      id: Date.now().toString(),
    };

    const updated = [...pendingExpenses, newExpense];
    setPendingExpenses(updated);
    localStorage.setItem("pending-expenses", JSON.stringify(updated));
  };

  const syncPendingExpenses = async () => {
    if (!token || pendingExpenses.length === 0) return;

    try {
      for (const expense of pendingExpenses) {
        await createExpenseMutation({
          token,
          amount: expense.amount,
          title: expense.title,
          category: expense.category,
          for: expense.for,
          date: expense.date,
        });
      }

      // Clear pending expenses after successful sync
      setPendingExpenses([]);
      localStorage.removeItem("pending-expenses");
    } catch (error) {
      console.error("Failed to sync pending expenses:", error);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingExpenses,
        addPendingExpense,
        syncPendingExpenses,
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
