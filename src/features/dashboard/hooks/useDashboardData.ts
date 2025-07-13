import { useMemo, useState, useCallback } from "react";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Expense, MonthlyData } from "../types";
import { Income } from "../types/income";

export function useDashboardData(token: string | null) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [key, setKey] = useState(0);

  const startDate = startOfMonth(currentDate).getTime();
  const endDate = endOfMonth(currentDate).getTime();

  const expensesResult = useQuery(
    api.expenses.getExpensesByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  const incomeResult = useQuery(
    api.cardsAndIncome.getIncomeByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  const expenses = expensesResult as unknown as Expense[] | undefined;
  const income = incomeResult as unknown as Income[] | undefined;
  
  const isLoading = expensesResult === undefined || incomeResult === undefined;

  const monthlyData = useMemo<MonthlyData | null>(() => {
    if (!expenses || !income) return null;

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalCount = expenses.length;

    // Calculate category totals
    const categoryTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
      const categories = Array.isArray(expense.category) 
        ? expense.category 
        : [expense.category];
      
      categories.forEach((cat) => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {});

    // Calculate daily totals
    const dailyTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
      const date = new Date(expense.date);
      const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[dayKey] = (acc[dayKey] || 0) + expense.amount;
      return acc;
    }, {});

    return {
      totalExpenses,
      totalIncome,
      totalCount,
      categoryTotals,
      dailyTotals,
    };
  }, [expenses, income]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const refetchExpenses = useCallback(() => {
    setKey((prevKey) => prevKey + 1);
  }, []);

  return {
    currentDate,
    expenses,
    monthlyData,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    refetchExpenses, // Expose the refetch function
  };
}
