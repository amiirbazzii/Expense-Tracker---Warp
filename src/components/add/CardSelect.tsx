"use client";

import { CreditCard } from "lucide-react";
import InputContainer from "@/components/InputContainer";

interface CardSelectProps {
  value: string;
  cards: { _id: string; name: string }[];
  onChange: (v: string) => void;
}

export function CardSelect({ value, cards, onChange }: CardSelectProps) {
  return (
    <InputContainer
      leftIcon={CreditCard}
      rightAdornment={
        <svg className="size-5 text-ink-secondary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-ink-primary placeholder:text-ink-secondary py-1 px-0 appearance-none font-normal"
        required
      >
        <option value="" className="bg-surface-raised text-ink-primary">Select card</option>
        {cards.map((card) => (
          <option key={card._id} value={card._id} className="bg-surface-raised text-ink-primary">
            {card.name}
          </option>
        ))}
      </select>
    </InputContainer>
  );
}
