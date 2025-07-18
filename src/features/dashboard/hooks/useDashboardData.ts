import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Expense, MonthlyData } from "../types";
import { Income } from "../types/income";
import { useSettings } from "@/contexts/SettingsContext";
import DateObject from "react-date-object";
import jalali from "react-date-object/calendars/jalali";
import gregorian from "react-date-object/calendars/gregorian";

export function useDashboardData(token: string | null) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  const [currentDate, setCurrentDate] = useState(new DateObject());
  const [key, setKey] = useState(0);

  // Adjust calendar for currentDate when settings change
  useEffect(() => {
    setCurrentDate(currentDate.convert(isJalali ? jalali : gregorian));
  }, [isJalali]);

  const startDate = new DateObject(currentDate).toFirstOfMonth().toUnix() * 1000;
  const endDate = new DateObject(currentDate).toLastOfMonth().toUnix() * 1000;

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
      const date = new DateObject({ date: expense.date, calendar: isJalali ? jalali : gregorian });
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
    setCurrentDate(currentDate.add(1, "month"));
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
