import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Expense, MonthlyData } from "../types";
import { Income } from "../types/income";
import { useSettings } from "@/contexts/SettingsContext";
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

  const expensesResult = useQuery(
    api.expenses.getExpensesByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  const incomeResult = useQuery(
    api.cardsAndIncome.getIncomeByDateRange,
    token ? { token, startDate, endDate, key } : "skip"
  );

  const allExpenses = expensesResult as unknown as Expense[] | undefined;
  const allIncome = incomeResult as unknown as Income[] | undefined;

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
  };
}
