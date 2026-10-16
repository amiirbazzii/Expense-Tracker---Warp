"use client";

import { useState } from "react";
import { CreditCard, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { useLocalData } from "@/hooks/useLocalData";

interface TotalBalanceCardProps {
  className?: string;
}

export function TotalBalanceCard({ className }: TotalBalanceCardProps) {
  const { settings } = useSettings();
  const router = useRouter();
  const { cards: cardBalances, isLoading } = useLocalData();
  const [isNavigating, setIsNavigating] = useState(false);

  const activeCards = cardBalances?.filter((card) => !card.isArchived);
  const totalBalance = isLoading ? undefined : activeCards?.reduce((sum, card) => sum + card.balance, 0);
  const cardsCount = isLoading ? undefined : activeCards?.length;
  const cardsLabel = cardsCount === undefined ? '…' : (cardsCount < 10 ? String(cardsCount) : '+9');

  const content = (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center justify-center text-ink-secondary">
          <CreditCard size={32} />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <h2 className="text-sm font-light text-ink-primary">Total Balance</h2>
          <p className={`text-lg font-bold ${totalBalance !== undefined && totalBalance >= 0 ? 'text-ink-success' : 'text-danger-text'}`}>
            {totalBalance === undefined
              ? '—'
              : (settings ? formatCurrency(totalBalance, settings.currency) : `$${totalBalance.toFixed(2)}`)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Chip>
          {`${cardsLabel} cards`}
        </Chip>
        <ChevronRight className="text-ink-secondary" size={20} />
      </div>
    </div>
  );

  if (isNavigating || totalBalance === undefined || cardsCount === undefined) {
    return (
      <Button 
        className={`w-full ${className || ''}`}
        onClick={() => {
          if (!isNavigating) {
            setIsNavigating(true);
            router.push('/cards');
          }
        }}
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
      onClick={() => {
        if (!isNavigating) {
          setIsNavigating(true);
          router.push('/cards');
        }
      }}
    >
      {content}
    </Button>
  );
}
