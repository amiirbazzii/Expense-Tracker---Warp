"use client";

import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { Chip } from "@/components/Chip";

interface Card {
  cardId: string;
  cardName: string;
}

interface CardFilterProps {
  cards: Card[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
}

export const CardFilter = ({ cards, selectedCardId, onSelectCard }: CardFilterProps) => {
  return (
    <div style={{ paddingBottom: '12px' }}>
      <div 
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
        className=""
      >
        <div 
          style={{
            display: 'flex',
            gap: '8px',
            width: 'max-content',
            minWidth: '100%'
          }}
        >
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCard(null)}
            className="flex-shrink-0 whitespace-nowrap cursor-pointer"
            role="button"
            aria-pressed={selectedCardId === null}
          >
            <Chip variant={selectedCardId === null ? 'enabled' : 'default'}>
              All
            </Chip>
          </motion.div>
          {cards.map((card) => (
            <motion.div
              key={card.cardId}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCard(card.cardId)}
              className="flex-shrink-0 whitespace-nowrap cursor-pointer"
              role="button"
              aria-pressed={selectedCardId === card.cardId}
            >
              <Chip
                variant={selectedCardId === card.cardId ? 'enabled' : 'default'}
                leftIcon={<CreditCard size={16} />}
              >
                {card.cardName}
              </Chip>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 
