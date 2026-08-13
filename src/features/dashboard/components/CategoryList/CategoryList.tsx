"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { ExpenseCard } from "@/components/cards/ExpenseCard";
import { IncomeCard } from "@/components/cards/IncomeCard";
import { useDeleteWithUndo } from "@/hooks/useDeleteWithUndo";
import { localDataStore } from "@/lib/store";
import type { Expense } from "../../types/expense";
import type { Income } from "../../types/income";

const byNewestFirst = <T extends { date: number }>(a: T, b: T) => b.date - a.date;

interface CategoryListProps {
  categoryTotals: Record<string, number>;
  expenses?: Expense[];
  income?: Income[];
  mode?: 'expenses' | 'income';
  cardMap?: Record<string, string>;
}

export function CategoryList({ categoryTotals, expenses = [], income = [], mode = 'expenses', cardMap = {} }: CategoryListProps) {
  const { settings } = useSettings();
  const router = useRouter();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Same delete-with-undo path the add screen uses, so a delete here queues
  // and syncs exactly like one made anywhere else.
  const { deleteWithUndo: deleteExpense, filterPending: filterExpenses } =
    useDeleteWithUndo<Expense>(
      (id) => localDataStore.deleteExpense(id),
      "Expense",
    );
  const { deleteWithUndo: deleteIncome, filterPending: filterIncomes } =
    useDeleteWithUndo<Income>(
      (id) => localDataStore.deleteIncome(id),
      "Income",
    );

  // `expenses`/`income` arrive already filtered, so drilling into a category
  // shows the same rows that produced its total.
  const expensesInCategory = useMemo(() => {
    if (!openCategory || mode === 'income') return [] as Expense[];
    return (expenses || [])
      .filter((e) =>
        Array.isArray(e.category) ? e.category.includes(openCategory) : (e as any).category === openCategory
      )
      .sort(byNewestFirst);
  }, [expenses, openCategory, mode]);

  const incomeInCategory = useMemo(() => {
    if (!openCategory || mode !== 'income') return [] as Income[];
    return (income || [])
      .filter((i) => i.category === openCategory)
      .sort(byNewestFirst);
  }, [income, openCategory, mode]);

  // Hides a row for the length of the undo window, before the delete lands.
  const visibleExpenses = filterExpenses(expensesInCategory);
  const visibleIncome = filterIncomes(incomeInCategory);
  const isEmpty =
    (mode === 'income' ? visibleIncome.length : visibleExpenses.length) === 0;

  const closeAndEdit = (path: string) => {
    setOpenCategory(null);
    router.push(path);
  };

  // Kept below the hooks: bailing out before them would change the hook order
  // between renders once this list empties out.
  if (!categoryTotals || Object.keys(categoryTotals).length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-4"
    >
      <div className="space-y-3">
        {Object.entries(categoryTotals)
          .filter(([category]) => category !== 'Card Transfer')
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => (
            <button
              key={`cat-${category}`}
              type="button"
              onClick={() => setOpenCategory(category)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:scale-[0.99] transition"
            >
              <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-800 text-sm font-medium">
                {category}
              </span>
              <span className="text-base font-semibold text-gray-900">
                {settings ? formatCurrency(amount, settings.currency) : `$${amount.toFixed(2)}`}
              </span>
            </button>
          ))}
      </div>

      <BottomSheet
        open={!!openCategory}
        onClose={() => setOpenCategory(null)}
        title={openCategory || undefined}
      >
        {openCategory && (
          <div className="space-y-3">
            {mode === 'income'
              ? visibleIncome.map((item) => (
                  <IncomeCard
                    key={String(item._id)}
                    income={item as any}
                    cardName={cardMap[(item as any).cardId] || "Unknown Card"}
                    onDelete={(id) => deleteIncome(String(id))}
                    onEdit={(id) => closeAndEdit(`/income/edit?id=${id}`)}
                  />
                ))
              : visibleExpenses.map((item) => (
                  <ExpenseCard
                    key={String(item._id)}
                    expense={item as any}
                    cardName={cardMap[(item as any).cardId] || "Unknown Card"}
                    onDelete={(id) => deleteExpense(String(id))}
                    onEdit={(id) => closeAndEdit(`/expenses/edit?id=${id}`)}
                  />
                ))}
            {isEmpty && (
              <p className="text-sm text-gray-500 text-center py-6">No items in this category.</p>
            )}
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
}
