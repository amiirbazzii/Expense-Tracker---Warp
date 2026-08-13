"use client";

import { useMemo } from "react";
import type { DashboardFilters } from "@/features/dashboard/components/DashboardFilterSheet";
import type { ExpenseLike, IncomeLike } from "@/utils/dashboard";
import { getDateKey } from "@/utils/dashboard";

interface UseDashboardDerivedDataResult<E, I> {
  categoryTotalsForMode: Record<string, number>;
  dailyTotalsForMode: Record<string, number>;
  totalForMode: number;
  /**
   * The exact rows the totals above were derived from, with the active
   * filters already applied. Anything drilling into a category has to read
   * from these — reading the unfiltered input instead makes a category's
   * detail view disagree with the total shown for it.
   */
  filteredExpensesForMode: E[];
  filteredIncomeForMode: I[];
}

// Generic over the row types so callers get their own concrete row type back
// rather than the structural minimum this hook needs.
export function useDashboardDerivedData<
  E extends ExpenseLike,
  I extends IncomeLike,
>(
  mode: "expenses" | "income",
  expenses: E[],
  income: I[],
  filters: DashboardFilters,
): UseDashboardDerivedDataResult<E, I> {
  return useMemo(() => {
    if (mode === "income") {
      let list = (income || []).filter(
        (item) => item && item.category !== "Card Transfer",
      );
      if (filters.categories.length > 0) {
        list = list.filter((it) =>
          filters.categories.includes(it.category),
        );
      }
      const categoryTotals = list.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + (item.amount || 0);
          return acc;
        },
        {},
      );
      const dailyTotals = list.reduce<Record<string, number>>(
        (acc, item) => {
          const key = getDateKey(item.date);
          acc[key] = (acc[key] || 0) + (item.amount || 0);
          return acc;
        },
        {},
      );
      const total = list.reduce((s, i) => s + (i.amount || 0), 0);
      return {
        categoryTotalsForMode: categoryTotals,
        dailyTotalsForMode: dailyTotals,
        totalForMode: total,
        filteredExpensesForMode: [],
        filteredIncomeForMode: list,
      };
    }

    const list = (expenses || []).filter((expense) => {
      const categories = Array.isArray(expense.category)
        ? expense.category
        : [expense.category];
      const notTransfer = !categories.includes("Card Transfer");
      const catOk =
        filters.categories.length > 0
          ? categories.some((c) => filters.categories.includes(c))
          : true;
      const forOk = filters.forValue
        ? Array.isArray(expense.for)
          ? expense.for.includes(filters.forValue)
          : expense.for === filters.forValue
        : true;
      return notTransfer && catOk && forOk;
    });

    const categoryTotals = list.reduce<Record<string, number>>(
      (acc, expense) => {
        const categories = Array.isArray(expense.category)
          ? expense.category
          : [expense.category];
        categories.forEach((c) => {
          acc[c] = (acc[c] || 0) + (expense.amount || 0);
        });
        return acc;
      },
      {},
    );

    const dailyTotals = list.reduce<Record<string, number>>(
      (acc, expense) => {
        const key = getDateKey(expense.date);
        acc[key] = (acc[key] || 0) + (expense.amount || 0);
        return acc;
      },
      {},
    );

    const total = list.reduce((s, e) => s + (e.amount || 0), 0);
    return {
      categoryTotalsForMode: categoryTotals,
      dailyTotalsForMode: dailyTotals,
      totalForMode: total,
      filteredExpensesForMode: list,
      filteredIncomeForMode: [],
    };
  }, [mode, expenses, income, filters]);
}
