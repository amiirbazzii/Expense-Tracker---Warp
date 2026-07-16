"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import type { CardDoc } from "@/lib/store/LocalDataStore";

interface TransferFormProps {
  cards: CardDoc[];
  fromCard: string;
  toCard: string;
  amount: string;
  isTransferring: boolean;
  onFromCardChange: (id: string) => void;
  onToCardChange: (id: string) => void;
  onAmountChange: (val: string) => void;
  onTransfer: () => void;
}

export function TransferForm({
  cards,
  fromCard,
  toCard,
  amount,
  isTransferring,
  onFromCardChange,
  onToCardChange,
  onAmountChange,
  onTransfer,
}: TransferFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Transfer Funds</h2>
        <p className="text-sm text-gray-600">
          Move money between your cards
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <select
            value={fromCard}
            onChange={(e) => onFromCardChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
          >
            <option value="">From Card</option>
            {cards.map((card) => (
              <option key={card.cardId} value={card.cardId}>
                {card.cardName}
              </option>
            ))}
          </select>
          <ArrowRight size={20} className="text-gray-400 shrink-0" />
          <select
            value={toCard}
            onChange={(e) => onToCardChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
          >
            <option value="">To Card</option>
            {cards.map((card) => (
              <option key={card.cardId} value={card.cardId}>
                {card.cardName}
              </option>
            ))}
          </select>
        </div>
        <CurrencyInput
          value={amount}
          onChangeValue={(val) => onAmountChange(val)}
          placeholder="Amount"
        />
        <Button
          onClick={onTransfer}
          size="medium"
          disabled={!fromCard || !toCard || !amount || isTransferring}
          loading={isTransferring}
          className="w-full"
          title="Transfer funds"
        >
          Transfer
        </Button>
      </div>
    </motion.div>
  );
}
