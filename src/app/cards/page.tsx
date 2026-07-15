"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppHeader from "@/components/AppHeader";
import { useLocalData } from "@/hooks/useLocalData";
import { useCardActions } from "@/hooks/useCardActions";
import { useCardTransfer } from "@/hooks/useCardTransfer";
import { AddCardForm } from "@/components/cards/AddCardForm";
import { TransferForm } from "@/components/cards/TransferForm";
import { CardList } from "@/components/cards/CardList";
import { ArchivedCardsSection } from "@/components/cards/ArchivedCardsSection";

export default function CardsPage() {
  const { token } = useAuth();
  const { settings } = useSettings();
  const { cards: cardBalances, expenses, income } = useLocalData();
  const { addCard, deleteCard, archiveCard, unarchiveCard, isSubmitting } =
    useCardActions();
  const {
    fromCard,
    setFromCard,
    toCard,
    setToCard,
    amount,
    setAmount,
    isTransferring,
    handleTransfer,
  } = useCardTransfer();

  const cardIdsWithData = useMemo(() => {
    const ids = new Set<string>();
    for (const exp of expenses ?? []) if (exp.cardId) ids.add(exp.cardId);
    for (const inc of income ?? []) if (inc.cardId) ids.add(inc.cardId);
    return ids;
  }, [expenses, income]);

  const activeCards = useMemo(
    () => cardBalances?.filter((c) => !c.isArchived) ?? [],
    [cardBalances],
  );

  const archivedCards = useMemo(
    () => cardBalances?.filter((c) => c.isArchived) ?? [],
    [cardBalances],
  );

  const currency = settings?.currency ?? "USD";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader title="Manage Cards" />

        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          <AddCardForm onAddCard={addCard} isSubmitting={isSubmitting} />

          <TransferForm
            cards={activeCards}
            fromCard={fromCard}
            toCard={toCard}
            amount={amount}
            isTransferring={isTransferring}
            onFromCardChange={setFromCard}
            onToCardChange={setToCard}
            onAmountChange={setAmount}
            onTransfer={() =>
              handleTransfer(cardBalances ?? [], token)
            }
          />

          <div className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Cards ({activeCards.length || 0})
              </h2>
            </div>

            <CardList
              cards={activeCards}
              archivedCount={archivedCards.length}
              currency={currency}
              cardIdsWithData={cardIdsWithData}
              onArchive={archiveCard}
              onDelete={deleteCard}
            />
          </div>

          <ArchivedCardsSection
            cards={archivedCards}
            onUnarchive={unarchiveCard}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
