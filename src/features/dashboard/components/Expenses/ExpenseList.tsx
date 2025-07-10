import { Expense, ExpenseCard } from "./ExpenseCard";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[] | undefined;
  onExpenseClick: (expense: Expense) => void;
}

export function ExpenseList({ expenses, onExpenseClick }: ExpenseListProps) {
  if (expenses === undefined) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-8 text-center"
      >
        <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500">No expenses for this period</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses
        .sort((a, b) => b._creationTime - a._creationTime)
        .map((expense, index) => (
          <ExpenseCard
            key={expense._id}
            expense={expense}
            onClick={onExpenseClick}
          />
        ))}
    </div>
  );
}
