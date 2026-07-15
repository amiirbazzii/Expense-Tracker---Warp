"use client";

import { useMemo } from "react";
import type {
  DashboardFilters,
  DatePreset,
} from "@/features/dashboard/components/DashboardFilterSheet";
import type { ExpenseLike, IncomeLike } from "@/utils/dashboard";
import { getDateKey } from "@/utils/dashboard";

interface UseDashboardDerivedDataResult {
  categoryTotalsForMode: Record<string, number>;
  dailyTotalsForMode: Record<string, number>;
  totalForMode: number;
}

export function useDashboardDerivedData(
  mode: "expenses" | "income",
  expenses: ExpenseLike[],
  income: IncomeLike[],
  filters: DashboardFilters,
): UseDashboardDerivedDataResult {
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
      };
    }

    let list = (expenses || []).filter((expense) => {
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
    };
  }, [mode, expenses, income, filters]);
}
