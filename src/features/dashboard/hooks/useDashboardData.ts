import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Expense, MonthlyData } from "../types";
import { Income } from "../types/income";
import { useSettings } from "@/contexts/SettingsContext";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import moment from 'jalali-moment';

export function useDashboardData(token: string | null, selectedCardId: string | null) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  const [currentDate, setCurrentDate] = useState(moment());
  const [key, setKey] = useState(0);

  useEffect(() => {
    moment.locale(isJalali ? 'fa' : 'en');
  }, [isJalali]);

  const startDate = currentDate.clone().startOf(isJalali ? 'jMonth' : 'month').valueOf();
  const endDate = currentDate.clone().endOf(isJalali ? 'jMonth' : 'month').valueOf();

  // Try to fetch from Convex with date range
  const expensesResult = useQuery(
    api.expenses.getExpensesByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  const incomeResult = useQuery(
    api.cardsAndIncome.getIncomeByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  // Get offline-first data as fallback
  const { 
    expenses: offlineExpenses, 
    income: offlineIncome,
    isUsingOfflineData,
    isLoading: offlineLoading
  } = useOfflineFirstData();

  // Determine which data source to use
  const hasConvexData = expensesResult !== undefined && incomeResult !== undefined;
  
  // Use Convex data if available, otherwise use offline data filtered by date
  const allExpenses = useMemo(() => {
    if (hasConvexData) {
      return expensesResult as unknown as Expense[] | undefined;
    }
    
    // Filter offline data by date range
    if (offlineExpenses && offlineExpenses.length > 0) {
      return (offlineExpenses as any[]).filter((exp: any) => 
        exp.date >= startDate && exp.date <= endDate
      ) as Expense[];
    }
    
    return undefined;
  }, [hasConvexData, expensesResult, offlineExpenses, startDate, endDate]);

  const allIncome = useMemo(() => {
    if (hasConvexData) {
      return incomeResult as unknown as Income[] | undefined;
    }
    
    // Filter offline data by date range
    if (offlineIncome && offlineIncome.length > 0) {
      return (offlineIncome as any[]).filter((inc: any) => 
        inc.date >= startDate && inc.date <= endDate
      ) as Income[];
    }
    
    return undefined;
  }, [hasConvexData, incomeResult, offlineIncome, startDate, endDate]);

  const expenses = useMemo(() => {
    if (!allExpenses) return undefined;
    if (!selectedCardId) return allExpenses;
    return allExpenses.filter((e) => e.cardId === selectedCardId);
  }, [allExpenses, selectedCardId]);

  const income = useMemo(() => {
    if (!allIncome) return undefined;
    if (!selectedCardId) return allIncome;
    return allIncome.filter((i) => i.cardId === selectedCardId);
  }, [allIncome, selectedCardId]);
  
  const isLoading = !hasConvexData && offlineLoading;

  const monthlyData = useMemo<MonthlyData | null>(() => {
    if (!expenses || !income) return null;

    const filteredExpenses = expenses.filter((expense) => {
      if (Array.isArray(expense.category)) {
        return !expense.category.includes("Card Transfer");
      }
      return expense.category !== "Card Transfer";
    });

    const filteredIncome = income.filter((item) => {
      if (Array.isArray(item.category)) {
        return !item.category.includes("Card Transfer");
      }
      return item.category !== "Card Transfer";
    });

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = filteredIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalCount = filteredExpenses.length;

    // Calculate category totals
    const categoryTotals = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const categories = Array.isArray(expense.category) 
        ? expense.category 
        : [expense.category];
      
      categories.forEach((cat) => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {});

    // Calculate daily totals
    const dailyTotals = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const date = moment(expense.date);
      const dayKey = date.format("YYYY-MM-DD");
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
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, "month"));
  };

  const refetchExpenses = useCallback(() => {
    setKey((prevKey) => prevKey + 1);
  }, []);

  const monthName = isJalali ? currentDate.format("jMMMM") : currentDate.format("MMMM");
  const year = isJalali ? currentDate.format("jYYYY") : currentDate.format("YYYY");

  return {
    currentDate,
    monthName,
    year,
    goToPreviousMonth,
    goToNextMonth,
    refetchExpenses,
    expenses,
    monthlyData,
    isLoading,
    isUsingOfflineData,
  };
}
