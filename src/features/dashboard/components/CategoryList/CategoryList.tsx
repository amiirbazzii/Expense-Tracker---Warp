import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { formatDate } from "@/lib/formatters";
import type { Expense } from "../../types/expense";

interface CategoryListProps {
  categoryTotals: Record<string, number>;
  expenses: Expense[];
}

export function CategoryList({ categoryTotals, expenses }: CategoryListProps) {
  const { settings } = useSettings();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (!categoryTotals || Object.keys(categoryTotals).length === 0) {
    return null;
  }

  const filteredByCategory = useMemo(() => {
    if (!openCategory) return [] as Expense[];
    return (expenses || []).filter((e) =>
      Array.isArray(e.category) ? e.category.includes(openCategory) : e.category === openCategory
    );
  }, [expenses, openCategory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-lg shadow-sm p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
      <div className="space-y-3">
        {Object.entries(categoryTotals)
          .filter(([category]) => category !== 'Card Transfer')
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => (
            <button
              key={category}
              type="button"
              onClick={() => setOpenCategory(category)}
              className="w-full flex justify-between items-center py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded-md hover:bg-gray-50"
            >
              <span className="text-gray-700 text-left">{category}</span>
              <span className="font-semibold text-gray-900">
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
              .sort((a, b) => b.date - a.date)
              .map((exp) => (
                <div key={String(exp._id)} className="flex justify-between items-start py-2">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{exp.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {settings ? formatDate(exp.date, settings.calendar, 'MMM d, yyyy') : new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">
                      -{settings ? formatCurrency(exp.amount, settings.currency) : exp.amount.toFixed(2)}
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
