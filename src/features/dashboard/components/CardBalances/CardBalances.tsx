import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface CardBalancesProps {
  className?: string;
}

export function CardBalances({ className }: CardBalancesProps) {
  const { token } = useAuth();
  const cardBalances = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");

  if (cardBalances === undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg shadow-sm p-6 ${className}`}
      >
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Card Balances</h2>
        </div>
        <div className="text-center py-4 text-gray-500">Loading...</div>
      </motion.div>
    );
  }

  if (cardBalances.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg shadow-sm p-6 ${className}`}
      >
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Card Balances</h2>
        </div>
        <div className="text-center py-4 text-gray-500">
          <p>No cards added yet</p>
          <p className="text-sm text-gray-400 mt-1">Add cards to track balances</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`bg-white rounded-lg shadow-sm p-6 ${className}`}
    >
      <div className="flex items-center space-x-2 mb-4">
        <CreditCard className="text-gray-600" size={20} />
        <h2 className="text-lg font-semibold text-gray-900">Card Balances</h2>
      </div>
      
      <div className="space-y-3">
        {cardBalances.map((card) => (
          <motion.div
            key={card.cardId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="text-blue-600" size={16} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{card.cardName}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-3">
                  <span className="flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                    ${card.totalIncome.toFixed(2)}
                  </span>
                  <span className="flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                    ${card.totalExpenses.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                card.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${card.balance.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">Balance</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
