import { DollarSign, TrendingUp } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface SummaryCardsProps {
  totalAmount: number;
  totalCount: number;
  isLoading: boolean;
}

export function SummaryCards({ totalAmount, totalCount, isLoading }: SummaryCardsProps) {
  const { settings } = useSettings();

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-4 w-full">
      <div className="bg-blue-50 p-5 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="text-blue-600" size={18} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Total</span>
                <div className="text-2xl font-bold text-gray-900">
                  {settings ? formatCurrency(totalAmount, settings.currency) : `$${totalAmount.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 p-5 rounded-xl flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={18} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Expenses</span>
                <div className="text-2xl font-bold text-gray-900">
                  {totalCount} items
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
