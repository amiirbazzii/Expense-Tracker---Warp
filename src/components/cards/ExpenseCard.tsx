"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CreditCard, Calendar, Trash2, Edit, RefreshCw, AlertCircle } from 'lucide-react';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, formatDate } from '@/lib/formatters';

type ExpenseItem = (Doc<"expenses"> | Omit<Doc<"expenses">, '_id' | 'userId'>) & {
  status?: 'pending' | 'failed';
  _id: string | Id<"expenses">;
};

interface ExpenseCardProps {
  expense: ExpenseItem;
  cardName: string;
  onDelete: (id: Id<"expenses">) => void;
  onRetry?: (id: string) => void;
  status?: 'pending' | 'failed';
}

export function ExpenseCard({ expense, cardName, onDelete, onRetry, status }: ExpenseCardProps) {
  const { settings } = useSettings();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  

    const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(expense._id as Id<"expenses">);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/expenses/edit/${expense._id}`);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry && typeof expense._id === 'string') {
      onRetry(expense._id);
    }
  };

  const isOffline = !!status;

  const forText = expense.for && expense.for.length > 0 ? ` for ${expense.for.join(', ')}` : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative cursor-pointer rounded-lg bg-white border border-gray-200 [box-shadow:0px_4px_12px_rgba(16,24,40,0.05)] p-4"
      onClick={() => setIsMenuOpen(!isMenuOpen)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title row with price at the end */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base leading-6 font-semibold text-gray-900 truncate pr-2">
              {expense.title}
            </h3>
            <p className="text-[16px] leading-5 font-semibold text-red-600 whitespace-nowrap">
              -{settings ? formatCurrency(expense.amount, settings.currency) : expense.amount.toFixed(2)}
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[13px] leading-5 text-gray-600">
            <span className="inline-flex items-center min-w-0">
              <CreditCard className="w-[14px] h-[14px] mr-1.5 text-gray-400" />
              <span className="truncate">{cardName}</span>
            </span>
            <span className="inline-flex items-center">
              <Calendar className="w-[14px] h-[14px] mr-1.5 text-gray-400" />
              <span>
                {settings
                  ? formatDate(expense.date, settings.calendar, 'yyyy ,d MMM')
                  : new Date(expense.date).toLocaleDateString()}
              </span>
            </span>
          </div>
          {/* Divider: full-bleed horizontally, 8px from info row */}
          <div className="mt-2 -mx-4 h-px bg-[#ECECEC]" />
          {/* Tags: 12px below divider */}
          <div className="mt-3 flex flex-wrap gap-2">
            {expense.category.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-[#EEEEEE] text-[#434343]"
              >
                {cat}
              </span>
            ))}
            {/* Move 'for' items into tags */}
            {Array.isArray(expense.for) && expense.for.map((f) => (
              <span
                key={`for-${String(f)}`}
                className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-[#EEEEEE] text-[#434343]"
              >
                {`for ${f}`}
              </span>
            ))}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && !isOffline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-4 top-4 mt-2 w-36 bg-white rounded-lg shadow-lg z-10 border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Edit size={14} className="mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
