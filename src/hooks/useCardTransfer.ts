"use client";

import { useState } from "react";
import { toast } from "sonner";
import { localDataStore } from "@/lib/store";
import { LocalStorageManager } from "@/lib/storage/LocalStorageManager";
import { MutationQueueManager } from "@/lib/queue/MutationQueueManager";
import type { CardDoc } from "@/lib/store/LocalDataStore";

interface UseCardTransferResult {
  fromCard: string;
  setFromCard: (id: string) => void;
  toCard: string;
  setToCard: (id: string) => void;
  amount: string;
  setAmount: (val: string) => void;
  isTransferring: boolean;
  handleTransfer: (cards: CardDoc[], token: unknown) => Promise<void>;
  resetTransfer: () => void;
}

export function useCardTransfer(): UseCardTransferResult {
  const [fromCard, setFromCard] = useState("");
  const [toCard, setToCard] = useState("");
  const [amount, setAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const resetTransfer = () => {
    setFromCard("");
    setToCard("");
    setAmount("");
  };

  const handleTransfer = async (cards: CardDoc[], token: unknown) => {
    if (!fromCard || !toCard || !amount) {
      toast.error("Please select both cards and enter an amount.");
      return;
    }

    if (fromCard === toCard) {
      toast.error("Source and destination cards cannot be the same.");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount to transfer.");
      return;
    }

    setIsTransferring(true);
    const localStorageManager = new LocalStorageManager();
    try {
      const fromCardName =
        cards.find((c) => c.cardId === fromCard)?.cardName || "Source";
      const toCardName =
        cards.find((c) => c.cardId === toCard)?.cardName || "Destination";
      const now = Date.now();

      const localExpense = await localStorageManager.saveExpense(
        {
          amount: transferAmount,
          title: `Transfer to ${toCardName}`,
          category: ["Card Transfer"],
          for: [],
          date: now,
          cardId: fromCard,
        },
        { skipEnqueue: true },
      );

      const localIncome = await localStorageManager.saveIncome(
        {
          amount: transferAmount,
          source: `Transfer from ${fromCardName}`,
          category: "Card Transfer",
          date: now,
          cardId: toCard,
        },
        { skipEnqueue: true },
      );

      const queue = new MutationQueueManager();
      await queue.enqueue("transferFunds", {
        token,
        fromCardId: fromCard,
        toCardId: toCard,
        amount: transferAmount,
        localExpenseId: localExpense.id,
        localIncomeId: localIncome.id,
      });

      await localDataStore.refresh();
      toast.success("Transfer successful.");
      resetTransfer();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data: string }).data
          : "The transfer could not be completed. Please try again.";
      toast.error(message);
    } finally {
      setIsTransferring(false);
    }
  };

  return {
    fromCard,
    setFromCard,
    toCard,
    setToCard,
    amount,
    setAmount,
    isTransferring,
    handleTransfer,
    resetTransfer,
  };
}
