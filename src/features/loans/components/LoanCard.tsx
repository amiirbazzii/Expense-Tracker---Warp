"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loan } from "../types";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface LoanCardProps {
  loan: Loan & { isCurrentMonthPaid?: boolean };
  onTap: (loan: Loan) => void;
}

export function LoanCard({ loan, onTap }: LoanCardProps) {
  const { settings } = useSettings();
  const progress =
    loan.totalInstallments > 0
      ? (loan.paidInstallments / loan.totalInstallments) * 100
      : 0;
  const remaining = loan.totalInstallments - loan.paidInstallments;

  const formattedTotal = settings
    ? formatCurrency(loan.totalAmount, settings.currency)
    : `$${loan.totalAmount.toLocaleString()}`;

  const formattedInstallment = settings
    ? formatCurrency(loan.installmentAmount, settings.currency)
    : `$${loan.installmentAmount.toLocaleString()}`;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(loan)}
      className="w-full text-left rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 transition-all active:bg-gray-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {loan.name}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{formattedTotal}</p>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-3">
          <span className="text-xs font-medium text-gray-500">
            Day {loan.monthlyPaymentDay}
          </span>
          <span className="text-sm font-semibold text-gray-900 mt-0.5">
            {formattedInstallment}
            <span className="text-xs font-normal text-gray-400">/mo</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              progress >= 100
                ? "#22c55e"
                : "linear-gradient(90deg, #6366f1, #8b5cf6)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {loan.paidInstallments} of {loan.totalInstallments} paid
        </span>
        <div className="flex items-center gap-2">
          {loan.isCurrentMonthPaid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Paid
            </span>
          )}
          <span className="text-xs font-medium text-gray-600">
            {remaining} remaining
          </span>
        </div>
      </div>
    </motion.button>
  );
}
