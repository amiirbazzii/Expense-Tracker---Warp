"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useRouter } from "next/navigation";

interface TotalBalanceCardProps {
  className?: string;
}

export function TotalBalanceCard({ className }: TotalBalanceCardProps) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const cardBalances = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");

  const totalBalance = cardBalances?.reduce((sum, card) => sum + card.balance, 0);

  if (totalBalance === undefined) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 text-center ${className}`}>
        Loading balance...
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push('/cards')}
      className={`w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors ${className}`}
    >
      <div className="flex items-center space-x-4">
        <CreditCard className="text-gray-600" size={24} />
        <div className="flex flex-col items-start">
          <h2 className="text-lg font-semibold text-gray-900">Total Balance</h2>
          <p className={`text-sm font-medium ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {settings ? formatCurrency(totalBalance, settings.currency) : `$${totalBalance.toFixed(2)}`}
          </p>
        </div>
      </div>
      <ChevronRight className="text-gray-400" size={20} />
    </motion.button>
  );
}
