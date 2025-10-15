"use client";

import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import type { Expense } from "../../types/expense";
import type { Income } from "../../types/income";

interface CategoryListProps {
  categoryTotals: Record<string, number>;
  expenses?: Expense[];
  income?: Income[];
  mode?: 'expenses' | 'income';
}

export function CategoryList({ categoryTotals, expenses = [], income = [], mode = 'expenses' }: CategoryListProps) {
  const { settings } = useSettings();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (!categoryTotals || Object.keys(categoryTotals).length === 0) {
    return null;
  }

  const filteredByCategory = useMemo(() => {
    if (!openCategory) return [] as (Expense | Income)[];
    if (mode === 'income') {
      return (income || []).filter((i) => i.category === openCategory);
    }
    return (expenses || []).filter((e) =>
      Array.isArray(e.category) ? e.category.includes(openCategory) : (e as any).category === openCategory
    );
  }, [expenses, income, openCategory, mode]);

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
              key={category}
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
        title={openCategory ? `${openCategory} • ${settings ? formatCurrency(categoryTotals[openCategory] || 0, settings.currency) : `$${(categoryTotals[openCategory] || 0).toFixed(2)}`}` : undefined}
      >
        {openCategory && (
          <div className="space-y-3">
            {filteredByCategory
              .slice()
              .sort((a, b) => (b.date as number) - (a.date as number))
              .map((item) => (
                <div key={String((item as any)._id)} className="flex justify-between items-start py-2">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {mode === 'income' ? (item as Income).category : (item as Expense).title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {settings ? formatDate(item.date as number, settings.calendar, 'MMM d, yyyy') : new Date(item.date as number).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${mode === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {mode === 'income' ? '' : '-'}{settings ? formatCurrency(item.amount as number, settings.currency) : (item.amount as number).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            {filteredByCategory.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No items in this category.</p>
            )}
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
}
