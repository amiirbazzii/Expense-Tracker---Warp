import { DollarSign, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface SummaryCardsProps {
  totalAmount: number;
  totalCount: number;
  isLoading: boolean;
}

export function SummaryCards({ totalAmount, totalCount, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <DollarSign className="text-blue-600" size={20} />
          <span className="text-sm text-blue-800">Total</span>
        </div>
        <div className="text-2xl font-bold text-blue-900 mt-1">
          ${totalAmount.toFixed(2)}
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-green-600" size={20} />
          <span className="text-sm text-green-800">Expenses</span>
        </div>
        <div className="text-2xl font-bold text-green-900 mt-1">
          {totalCount}
        </div>
      </div>
    </div>
  );
}
