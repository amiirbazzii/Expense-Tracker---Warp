"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreditCard, Trash2, Edit } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import { useAuth } from '@/contexts/AuthContext';

interface IncomeCardProps {
  income: Doc<"income">;
  cardName: string;
  onDelete: () => void;
}

export function IncomeCard({ income, cardName, onDelete }: IncomeCardProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const deleteIncomeMutation = useMutation(api.cardsAndIncome.deleteIncome);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      toast.error("Authentication failed.");
      return;
    }
    try {
      await deleteIncomeMutation({ token, incomeId: income._id });
      toast.success("Income deleted successfully!");
      onDelete();
    } catch (error) {
      toast.error("Failed to delete income.");
      console.error(error);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/income/edit/${income._id}`);
  };

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
            {income.source}
          </h3>
          <div className="text-sm text-gray-600 mt-1 flex items-center">
            <CreditCard className="inline w-4 h-4 mr-1.5 text-gray-400" />
            <span>{cardName}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded-full">
              {income.category}
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="font-bold text-green-500 text-md">+${income.amount.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{format(new Date(income.date), "MMM d, yyyy")}</p>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
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
