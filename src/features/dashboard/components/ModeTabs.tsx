"use client";

import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

export type ModeType = "expenses" | "income";

interface ModeTabsProps {
  mode: ModeType;
  totalExpenses?: number;
  totalIncome?: number;
  onChange: (mode: ModeType) => void;
  className?: string;
}

export function ModeTabs({ mode, totalExpenses = 0, totalIncome = 0, onChange, className = "" }: ModeTabsProps) {
  const { settings } = useSettings();

  const fmt = (val: number) => (settings ? formatCurrency(val, settings.currency) : val.toLocaleString());

  return (
    <div className={className}>
      <div className="relative grid grid-cols-2 border-b border-t border-gray-200 select-none" role="tablist" aria-label="Data mode">
        {/* Expenses Tab */}
        <button
          type="button"
          onClick={() => onChange("expenses")}
          className="relative py-3 text-center"
          aria-pressed={mode === "expenses"}
          aria-selected={mode === "expenses"}
          role="tab"
        >
          <div className="relative mx-auto flex w-[120px] flex-col items-center">
            <div className="text-[14px] text-gray-400">Expenses</div>
            <div className="text-[16px] font-medium text-gray-900 tracking-tight">
              {fmt(totalExpenses)}
            </div>
          </div>
        </button>

        {/* Vertical divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 pointer-events-none" aria-hidden="true" />

        {/* Income Tab */}
        <button
          type="button"
          onClick={() => onChange("income")}
          aria-pressed={mode === "income"}
          aria-selected={mode === "income"}
          role="tab"
        >
          <div className="relative mx-auto flex w-[120px] flex-col items-center">
            <div className="text-[14px] text-gray-400">Income</div>
            <div className="text-[16px] font-medium text-gray-900 tracking-tight">{fmt(totalIncome)}</div>
          </div>
        </button>

        {/* Animated indicator (single element) */}
        <motion.span
          initial={false}
          animate={{ left: mode === 'expenses' ? 'calc(25% - 60px)' : 'calc(75% - 60px)' }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className="absolute -bottom-[0px] w-[120px] h-[4px] bg-black rounded-tl-full rounded-tr-full rounded-br-none rounded-bl-none"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
