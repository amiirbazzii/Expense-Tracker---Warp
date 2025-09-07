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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 p-4 rounded-xl animate-pulse h-[90px]" />
        <div className="bg-gray-100 p-4 rounded-xl animate-pulse h-[90px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-4 w-full">
      <div className="p-5 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="px-2 py-4 bg-gray-50 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Total Income</span>
                <div className="text-lg font-bold text-gray-900">
                  {settings ? formatCurrency(totalIncome, settings.currency) : `$${totalIncome.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-5 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="px-2 py-4 bg-gray-50 rounded-lg">
                <TrendingDown className="text-red-600" size={24} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Total Expenses</span>
                <div className="text-lg font-bold text-gray-900">
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
