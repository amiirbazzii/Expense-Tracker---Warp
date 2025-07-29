"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { CreditCard, Trash2, Edit, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '@/contexts/AuthContext';
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
  const { token } = useAuth();
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
      className="bg-white rounded-lg shadow-sm p-4 cursor-pointer relative"
      onClick={() => setIsMenuOpen(!isMenuOpen)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-md truncate pr-4">
            {expense.title}
            {forText && <span className="text-gray-500 font-normal">{forText}</span>}
          </h3>
          <div className="text-sm text-gray-600 mt-1 flex items-center">
            <CreditCard className="inline w-4 h-4 mr-1.5 text-gray-400" />
            <span>{cardName}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {expense.category.map(cat => (
              <span key={cat} className="bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="font-bold text-red-500 text-md">
            -{settings ? formatCurrency(expense.amount, settings.currency) : expense.amount.toFixed(2)}
          </p>
          <div className="flex flex-col items-end mt-1">
            <p className="text-xs text-gray-400">
              {settings ? formatDate(expense.date, settings.calendar, 'MMM d, yyyy') : new Date(expense.date).toLocaleDateString()}
            </p>
            <div className="h-5 mt-1 flex items-center">
              {status === 'pending' && (
                <span title="Syncing...">
                  <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                </span>
              )}
              {status === 'failed' && onRetry && (
                <button onClick={handleRetry} title="Sync failed. Click to retry.">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && !isOffline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-4 top-4 mt-2 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
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
