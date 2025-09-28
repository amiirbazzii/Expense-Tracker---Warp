"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

interface TotalBalanceCardProps {
  className?: string;
}

export function TotalBalanceCard({ className }: TotalBalanceCardProps) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const cardBalances = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");

  const totalBalance = cardBalances?.reduce((sum, card) => sum + card.balance, 0);
  const cardsCount = cardBalances?.length;
  const cardsLabel = cardsCount === undefined ? '…' : (cardsCount < 10 ? String(cardsCount) : '+9');

  const content = (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center justify-center text-gray-500">
          <CreditCard size={32} />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <h2 className="text-sm font-light text-gray-900">Total Balance</h2>
          <p className={`text-lg font-bold ${totalBalance !== undefined && totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalBalance === undefined
              ? '—'
              : (settings ? formatCurrency(totalBalance, settings.currency) : `$${totalBalance.toFixed(2)}`)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full border px-3 text-[12px] font-medium text-[#707070]"
          style={{ borderColor: '#D9D9D9', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          {`${cardsLabel} cards`}
        </span>
        <ChevronRight className="text-gray-600" size={20} />
      </div>
    </div>
  );

  if (totalBalance === undefined || cardsCount === undefined) {
    return (
      <Button 
        className={`w-full ${className || ''}`}
        onClick={() => router.push('/cards')}
        loading
        disabled
      >
        {content}
      </Button>
    );
  }

  return (
    <Button 
      className={`w-full ${className || ''}`}
      onClick={() => router.push('/cards')}
    >
      {content}
    </Button>
  );
}
