"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { Loan, computeMonthlyDue } from "../types";
import { Plus } from "lucide-react";

interface DashboardLoanSectionProps {
  loans: Loan[] | undefined;
  isLoading: boolean;
  date: Date;
}

export function DashboardLoanSection({
  loans,
  isLoading,
  date,
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
      aria-busy={isLoading}
      className="w-full flex items-center justify-center transition-colors hover:bg-surface-hover active:bg-surface-active border-t border-border-subtle"
    >
      {!hasLoans ? (
        // Empty state CTA
        <div className="flex items-center justify-center py-2 gap-2 text-ink-secondary">
          <Plus size={16} className="text-ink-secondary" />
          <p className="text-sm font-normal">Add your loans</p>
        </div>
      ) : (
        // Monthly Summary
        <>
          <div className="flex flex-1 items-center gap-3 py-3 px-4">
            <div className="text-left">
              <p className="text-xs text-ink-secondary leading-tight">
                Amount to pay this month
              </p>
              <p className="text-base font-bold text-ink-primary mt-0.5">
                {(() => {
                  const { totalDue } = computeMonthlyDue(loans, date);
                  return settings
                    ? formatCurrency(totalDue, settings.currency)
                    : `$${totalDue.toLocaleString()}`;
                })()}
              </p>
            </div>
          </div>
          <span className="border border-border-subtle text-xs font-medium px-3 py-2 mx-4 bg-surface-sunken text-ink-secondary rounded-full">
            {computeMonthlyDue(loans, date).loanCount} loans
          </span>
        </>
      )}
    </motion.button>
  );
}
