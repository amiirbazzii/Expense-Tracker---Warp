"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/Button";
import type { CardDoc } from "@/lib/store/LocalDataStore";

interface ArchivedCardsSectionProps {
  cards: CardDoc[];
  onUnarchive: (cardId: string) => void;
}

export function ArchivedCardsSection({
  cards,
  onUnarchive,
}: ArchivedCardsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (cards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border-subtle bg-surface-app overflow-hidden mb-4"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors min-h-[44px]"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide archived cards" : "View archived cards"}
      >
        <span>View Archived Cards ({cards.length})</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-ink-tertiary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-tertiary" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="archived-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle divide-y divide-border-subtle">
              {cards.map((card) => (
                <div
                  key={card.cardId}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="font-medium text-ink-primary text-sm">
                    {card.cardName}
                  </div>
                  <Button
                      variant="secondary"
                      size="small"
                      onClick={() => onUnarchive(card.cardId)}
                    >
                    Unarchive
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
