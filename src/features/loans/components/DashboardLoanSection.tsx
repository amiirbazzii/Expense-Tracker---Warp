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
      className="w-full flex items-center justify-center transition-colors active:bg-gray-50 border-t border-gray-200"
    >
      {!hasLoans ? (
        // Empty state CTA
        <div className="flex items-center justify-center py-2 gap-2 text-gray-500">
          <Plus size={16} className="text-gray-500" />
          <p className="text-sm font-normal">Add your loans</p>
        </div>
      ) : (
        // Monthly Summary
        <>
          <div className="flex flex-1 items-center gap-3 py-3 px-4">
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
          <span className="border border-gray-200 text-xs font-medium px-3 py-2 mx-4  bg-gray-50 text-gray-600 rounded-full">
            {computeMonthlyDue(loans, month, year).loanCount} loans
          </span>
        </>
      )}
    </motion.button>
  );
}
