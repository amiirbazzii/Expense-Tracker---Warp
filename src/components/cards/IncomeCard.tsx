"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Id } from "../../../convex/_generated/dataModel";
import { CreditCard, Calendar, Trash2, Edit } from 'lucide-react';
import { Doc } from '../../../convex/_generated/dataModel';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface IncomeCardProps {
  income: Doc<"income">;
  cardName: string;
  onDelete: (incomeId: Id<"income">) => void;
}

export function IncomeCard({ income, cardName, onDelete }: IncomeCardProps) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(income._id);
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
      className="group relative cursor-pointer rounded-lg bg-white border border-gray-200 [box-shadow:0px_4px_12px_rgba(16,24,40,0.05)] p-4"
      onClick={() => setIsMenuOpen(!isMenuOpen)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title row with price at the end */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base leading-6 font-semibold text-gray-900 truncate pr-2">
              {income.source}
            </h3>
            <p className="text-[16px] leading-5 font-semibold text-green-600 whitespace-nowrap">
              +{settings ? formatCurrency(income.amount, settings.currency) : income.amount.toFixed(2)}
            </p>
          </div>
          {/* Info row */}
          <div className="mt-1.5 flex items-center gap-4 text-[13px] leading-5 text-gray-600">
            <span className="inline-flex items-center min-w-0">
              <CreditCard className="w-[14px] h-[14px] mr-1.5 text-gray-400" />
              <span className="truncate">{cardName}</span>
            </span>
            <span className="inline-flex items-center">
              <Calendar className="w-[14px] h-[14px] mr-1.5 text-gray-400" />
              <span>
                {settings
                  ? formatDate(income.date, settings.calendar, 'yyyy ,d MMM')
                  : new Date(income.date).toLocaleDateString()}
              </span>
            </span>
          </div>
          {/* Divider above tags */}
          <div className="mt-2 -mx-4 h-px bg-[#ECECEC]" />
          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.isArray((income as any).category)
              ? (income as any).category.map((cat: string) => (
                  <span key={cat} className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-[#EEEEEE] text-[#434343]">
                    {cat}
                  </span>
                ))
              : income.category && (
                  <span className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-[#EEEEEE] text-[#434343]">
                    {income.category as unknown as string}
                  </span>
                )}
          </div>
          {/* Notes (optional) */}
          {income.notes && (
            <p className="mt-3 text-[13px] leading-5 text-gray-400 truncate">
              {income.notes}
            </p>
          )}
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
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
