import { AnimatePresence, motion } from "framer-motion";
import { Expense, ExpenseCard } from ".";
import { Receipt } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel"; // Import Id type

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: Id<"expenses">) => void;
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="mx-auto text-ink-tertiary mb-4" size={48} />
        <p className="text-ink-secondary">No expenses recorded for this period</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-4">
      <AnimatePresence>
        {expenses
          .sort((a, b) => b._creationTime - a._creationTime)
          .map((expense) => (
            <ExpenseCard
              key={expense._id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
      </AnimatePresence>
    </motion.div>
  );
}
