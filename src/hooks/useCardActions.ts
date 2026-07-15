"use client";

import { useState } from "react";
import { toast } from "sonner";
import { localDataStore } from "@/lib/store";
import type { CardDoc } from "@/lib/store/LocalDataStore";

interface UseCardActionsResult {
  addCard: (name: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  archiveCard: (cardId: string) => Promise<void>;
  unarchiveCard: (cardId: string) => Promise<void>;
  isSubmitting: boolean;
}

export function useCardActions(): UseCardActionsResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCard = async (name: string) => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await localDataStore.addCard(name.trim());
      toast.success("Your card has been added.");
    } catch {
      toast.error("There was an error adding your card. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await localDataStore.deleteCard(cardId);
      toast.success("The card has been deleted.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "There was an error deleting the card.";
      toast.error(message);
    }
  };

  const archiveCard = async (cardId: string) => {
    await localDataStore.archiveCard(cardId);
    toast("Card archived", {
      action: {
        label: "Undo",
        onClick: () => localDataStore.unarchiveCard(cardId),
      },
      duration: 5000,
    });
  };

  const unarchiveCard = async (cardId: string) => {
    await localDataStore.unarchiveCard(cardId);
  };

  return { addCard, deleteCard, archiveCard, unarchiveCard, isSubmitting };
}
