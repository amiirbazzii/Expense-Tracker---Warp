"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { Loan, computeMonthlyDue } from "../types";
import { Plus, ChevronRight, Landmark } from "lucide-react";

interface DashboardLoanSectionProps {
  loans: Loan[] | undefined;
  isLoading: boolean;
  month: number;
  year: number;
}

export function DashboardLoanSection({
  loans,
  isLoading,
  month,
  year,
}: DashboardLoanSectionProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [isNavigating, setIsNavigating] = useState(false);

  if (isLoading) {
    return (
      <div className="w-full h-24 animate-pulse bg-gray-100 rounded-xl mt-4" />
    );
  }

  const handlePress = () => {
    if (!isNavigating) {
      setIsNavigating(true);
      router.push("/loans");
    }
  };

  const hasLoans = loans && loans.length > 0;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={handlePress}
      className="w-full mt-4 flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm transition-colors active:bg-gray-50"
    >
      {!hasLoans ? (
        // Empty state CTA
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
              <Plus size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                Add your first loan
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Track installments easily
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </>
      ) : (
        // Monthly Summary
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
              <Landmark size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 leading-tight">
                Amount to pay this month
              </p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {(() => {
                  const { totalDue } = computeMonthlyDue(loans, month, year);
                  return settings
                    ? formatCurrency(totalDue, settings.currency)
                    : `$${totalDue.toLocaleString()}`;
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              {computeMonthlyDue(loans, month, year).loanCount} loans
            </span>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </>
      )}
    </motion.button>
  );
}
