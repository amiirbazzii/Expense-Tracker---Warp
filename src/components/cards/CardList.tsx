"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Archive,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { DropdownMenu } from "@/components/DropdownMenu";
import type { Currency } from "@/contexts/SettingsContext";
import type { CardDoc } from "@/lib/store/LocalDataStore";

interface CardListProps {
  cards: CardDoc[];
  archivedCount: number;
  currency: Currency;
  cardIdsWithData: Set<string>;
  onArchive: (cardId: string) => void;
  onDelete: (cardId: string) => void;
}

export function CardList({
  cards,
  archivedCount,
  currency,
  cardIdsWithData,
  onArchive,
  onDelete,
}: CardListProps) {
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        openMenuRef.current &&
        !openMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuCardId(null);
      }
    }
    if (openMenuCardId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuCardId]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="mx-auto text-ink-tertiary mb-4" size={48} />
        <p className="text-ink-secondary">
          {archivedCount > 0
            ? "All cards are archived."
            : "You haven't added any cards yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <div
          key={card.cardId}
          className="relative"
          ref={
            openMenuCardId === card.cardId ? openMenuRef : null
          }
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl bg-surface-raised border border-border-subtle shadow-neumo overflow-hidden cursor-pointer hover:shadow-neumo-hover transition-shadow"
            onClick={() =>
              setOpenMenuCardId((prev) =>
                prev === card.cardId ? null : card.cardId,
              )
            }
            aria-label={`Card ${card.cardName}`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="font-semibold text-ink-primary">
                {card.cardName}
              </div>
              <div
                className={`text-base font-bold ${card.balance >= 0 ? "text-sync-synced" : "text-danger-text"}`}
              >
                {formatCurrency(card.balance, currency)}
              </div>
            </div>
            <div className="h-px bg-border-subtle" />
            <div className="flex items-center justify-start gap-6 px-4 py-3 text-sm text-ink-secondary">
              <span className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-sync-synced" />
                {formatCurrency(card.totalIncome, currency)}
              </span>
              <span className="flex items-center">
                <TrendingDown className="w-4 h-4 mr-2 text-danger-text" />
                {formatCurrency(card.totalExpenses, currency)}
              </span>
            </div>
          </motion.div>
          <DropdownMenu
            isOpen={openMenuCardId === card.cardId}
            className="right-0 top-full mt-2"
          >
            <button
              onClick={() => {
                onArchive(card.cardId);
                setOpenMenuCardId(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-ink-primary hover:bg-surface-hover text-left"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </button>
            <button
              onClick={() => {
                if (cardIdsWithData.has(card.cardId)) return;
                onDelete(card.cardId);
                setOpenMenuCardId(null);
              }}
              disabled={cardIdsWithData.has(card.cardId)}
              className={`flex items-center w-full px-4 py-2 text-sm text-left ${cardIdsWithData.has(card.cardId) ? "text-ink-disabled cursor-not-allowed" : "text-danger-text hover:bg-surface-hover"}`}
              title={
                cardIdsWithData.has(card.cardId)
                  ? "Archive instead — this card has transactions"
                  : "Delete card"
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
