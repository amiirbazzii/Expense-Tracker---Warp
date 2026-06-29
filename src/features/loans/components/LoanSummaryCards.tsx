"use client";

import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { LoanSummary } from "../types";

interface LoanSummaryCardsProps {
  summary: LoanSummary | undefined;
}

export function LoanSummaryCards({ summary }: LoanSummaryCardsProps) {
  const { settings } = useSettings();

  const getDisplayValue = (field: keyof LoanSummary | "active") => {
    if (!summary) return "—";
    if (field === "active") return `${summary.activeCount} Loans`;

    const amount = summary[field as keyof LoanSummary];
    if (typeof amount !== "number") return "—";

    return settings
      ? formatCurrency(amount, settings.currency)
      : `$${amount.toLocaleString()}`;
  };

  return (
    <div className="flex items-center justify-center py-6">
      {/* Active Loans */}
      <div className="text-left px-2">
        <p className="text-sm text-gray-500">Active</p>
        <p className="text-base font-medium text-black whitespace-nowrap">
          {getDisplayValue("active")}
        </p>
      </div>

      {/* Divider */}
      <div className="h-10 w-[1px] bg-gray-200 mx-2" />

      {/* Total Amount */}
      <div className="text-left px-2">
        <p className="text-sm text-gray-500">Total</p>
        <p className="text-base font-medium text-black whitespace-nowrap">
          {getDisplayValue("totalAmount")}
        </p>
      </div>

      {/* Divider */}
      <div className="h-10 w-[1px] bg-gray-200 mx-2" />

      {/* Remaining Balance */}
      <div className="text-left px-2">
        <p className="text-sm text-gray-500">Remaining</p>
        <p className="text-base font-medium text-black whitespace-nowrap">
          {getDisplayValue("remainingBalance")}
        </p>
      </div>
    </div>
  );
}
