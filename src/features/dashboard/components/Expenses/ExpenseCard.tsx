import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from 'react';
import { ExpenseActionMenu } from './ExpenseActionMenu';

export interface Expense {
  _id: string;
  _creationTime: number;
  title: string;
  amount: number;
  category: string[];
  date: number;
  for?: string;
}

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

export function ExpenseCard({ expense, onEdit }: ExpenseCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cardRef]);

  const handleCardClick = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleEdit = () => {
    onEdit(expense);
    setIsMenuOpen(false);
  };



  return (
    <div className="relative" ref={cardRef}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleCardClick}
          aria-label={`Expense: ${expense.title} for $${expense.amount.toFixed(2)}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {expense.title}
                {expense.for && ` for ${expense.for}`}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">
                ${expense.amount.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              {Array.isArray(expense.category) ? expense.category.join(', ') : expense.category}
            </div>
            <div className="text-gray-500">
              {format(new Date(expense.date), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
            {isMenuOpen && (
                <ExpenseActionMenu onEdit={handleEdit} />
            )}
        </AnimatePresence>
    </div>
  );
}
