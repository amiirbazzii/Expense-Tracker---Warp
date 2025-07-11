"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Doc } from "../../convex/_generated/dataModel";

interface IncomeCardProps {
  income: Doc<"incomes">;
  cardName: string;
  onEdit: (income: Doc<"incomes">) => void;
  onDelete: (income: Doc<"incomes">) => void;
}

export function IncomeCard({ income, cardName, onEdit, onDelete }: IncomeCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = () => {
    setIsMenuOpen(false);
    onEdit(income);
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete(income);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-4 relative"
    >
      {/* Top row: Source and Amount */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800 text-md truncate pr-4">
          {income.source}
        </h3>
        <div className="flex items-center gap-2">
          <p className="font-bold text-green-600 text-md">
            +${income.amount.toFixed(2)}
          </p>
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMenuToggle}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="More options"
            >
              <MoreVertical size={16} />
            </motion.button>
            
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]"
                >
                  <button
                    onClick={handleEdit}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Date below amount */}
      <div className="text-right mb-2">
        <div className="text-sm text-gray-500">
          {format(new Date(income.date), "MMM d, yyyy")}
        </div>
      </div>

      {/* Card name with icon and category */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{cardName}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full">
            {income.category}
          </span>
        </div>
      </div>

      {/* Optional notes */}
      {income.notes && (
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Notes:</strong> {income.notes}
        </div>
      )}

      {/* Click outside handler */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </motion.div>
  );
}
