import { useMemo, useState, useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocalData } from "@/hooks/useLocalData";
import { Expense, MonthlyData } from "../types";
import { Income } from "../types/income";
import moment from 'jalali-moment';

export function useDashboardData(token: string | null, selectedCardId: string | null, dateRangeOverride?: { start: number; end: number }) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  const [currentDate, setCurrentDate] = useState(moment());

  useEffect(() => {
    moment.locale(isJalali ? 'fa' : 'en');
  }, [isJalali]);

  const startDate = (dateRangeOverride?.start) ?? currentDate.clone().startOf(isJalali ? 'jMonth' : 'month').valueOf();
  const endDate = (dateRangeOverride?.end) ?? currentDate.clone().endOf(isJalali ? 'jMonth' : 'month').valueOf();

  // Read all data from the reactive local store
  const { expenses: allLocalExpenses, income: allLocalIncome } = useLocalData();

  // Filter by the current month / date range
  const allExpenses = useMemo(() => {
    return (allLocalExpenses as any[]).filter((exp) =>
      exp.date >= startDate && exp.date <= endDate
    ) as Expense[];
  }, [allLocalExpenses, startDate, endDate]);

  const allIncome = useMemo(() => {
    return (allLocalIncome as any[]).filter((inc) =>
      inc.date >= startDate && inc.date <= endDate
    ) as Income[];
  }, [allLocalIncome, startDate, endDate]);

  const expenses = useMemo(() => {
    if (!selectedCardId) return allExpenses;
    return allExpenses.filter((e) => e.cardId === selectedCardId);
  }, [allExpenses, selectedCardId]);

  const income = useMemo(() => {
    if (!selectedCardId) return allIncome;
    return allIncome.filter((i) => i.cardId === selectedCardId);
  }, [allIncome, selectedCardId]);

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

  // No-op under local-first: data is always live via the store subscription.
  // Kept for API compatibility with consumers that call it after writes.
  const refetchExpenses = useCallback(() => {
    // The store re-renders automatically on writes; nothing to do here.
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
    income,
    monthlyData,
    isLoading: false,
    isUsingOfflineData: false,
  };
}
