"use client";

import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { LoanSummary } from "../types";
import { Landmark, Wallet, TrendingDown } from "lucide-react";

interface LoanSummaryCardsProps {
  summary: LoanSummary | undefined;
}

const cardItems = [
  {
    key: "active",
    label: "Active Loans",
    icon: Landmark,
    getValue: (s: LoanSummary) => String(s.activeCount),
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    key: "total",
    label: "Total Loan Amount",
    icon: Wallet,
    getValue: null, // Uses currency formatting
    field: "totalAmount" as const,
    color: "text-gray-900",
    bgColor: "bg-gray-50",
  },
  {
    key: "remaining",
    label: "Remaining Balance",
    icon: TrendingDown,
    getValue: null,
    field: "remainingBalance" as const,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

export function LoanSummaryCards({ summary }: LoanSummaryCardsProps) {
  const { settings } = useSettings();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {cardItems.map((item, index) => {
        const Icon = item.icon;
        let displayValue = "—";

        if (summary) {
          if (item.getValue) {
            displayValue = item.getValue(summary);
          } else if (item.field) {
            const amount = summary[item.field];
            displayValue = settings
              ? formatCurrency(amount, settings.currency)
              : `$${amount.toLocaleString()}`;
          }
        }

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex-1 min-w-[110px] rounded-xl border border-gray-200 bg-white p-3"
          >
            <div
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${item.bgColor} mb-2`}
            >
              <Icon size={16} className={item.color} />
            </div>
            <p className="text-[11px] text-gray-500 leading-tight mb-1">
              {item.label}
            </p>
            <p className={`text-sm font-bold ${item.color} truncate`}>
              {displayValue}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
