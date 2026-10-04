"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  isLoading: boolean;
}

export function SummaryCards({ totalIncome, totalExpenses, isLoading }: SummaryCardsProps) {
  const { settings } = useSettings();

  return (
    <div className="flex flex-row gap-4 w-full">
      <div className="p-1 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="px-2 py-4 bg-surface-sunken rounded-lg">
                <TrendingUp className="text-sync-synced" size={24} />
              </div>
              <div>
                <span className="text-sm font-medium text-ink-secondary">Total Income</span>
                <div className="text-lg font-bold text-ink-primary">
                  {settings ? formatCurrency(totalIncome, settings.currency) : `$${totalIncome.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-1 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="px-2 py-4 bg-surface-sunken rounded-lg">
                <TrendingDown className="text-danger-text" size={24} />
              </div>
              <div>
                <span className="text-sm font-medium text-ink-secondary">Total Expenses</span>
                <div className="text-lg font-bold text-ink-primary">
                {settings ? formatCurrency(totalExpenses, settings.currency) : `$${totalExpenses.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
