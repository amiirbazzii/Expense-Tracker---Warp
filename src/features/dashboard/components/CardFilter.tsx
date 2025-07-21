import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";

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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCard(null)}
            className={`px-4 py-2 text-sm font-medium rounded-full flex-shrink-0 whitespace-nowrap transition-colors duration-200 ${
              selectedCardId === null
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </motion.button>
          {cards.map((card) => (
            <motion.button
              key={card.cardId}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCard(card.cardId)}
              className={`px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-2 flex-shrink-0 whitespace-nowrap transition-colors duration-200 ${
                selectedCardId === card.cardId
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <CreditCard size={16} />
              <span>{card.cardName}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
