import { motion } from "framer-motion";

interface CategoryListProps {
  categoryTotals: Record<string, number>;
}

export function CategoryList({ categoryTotals }: CategoryListProps) {
  if (!categoryTotals || Object.keys(categoryTotals).length === 0) {
    return null;
  }

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
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-gray-700">{category}</span>
              <span className="font-semibold text-gray-900">
                ${amount.toFixed(2)}
              </span>
            </div>
          ))}
      </div>
    </motion.div>
  );
}
