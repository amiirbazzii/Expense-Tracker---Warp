"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Plus } from "lucide-react";
import { InputContainer } from "@/components/InputContainer";
import { Button } from "@/components/Button";

interface AddCardFormProps {
  onAddCard: (name: string) => Promise<void>;
  isSubmitting: boolean;
}

export function AddCardForm({ onAddCard, isSubmitting }: AddCardFormProps) {
  const [cardName, setCardName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddCard(cardName);
    if (!isSubmitting) setCardName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddCard(cardName).then(() => {
        if (!isSubmitting) setCardName("");
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
    >
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Add New Card</h2>
        <p className="text-sm text-gray-600">
          Enter a name for your new card
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <InputContainer
          leftIcon={CreditCard}
          className="flex-grow"
          contentClassName="h-full"
        >
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Card name ..."
            className="w-full bg-transparent outline-none border-0 text-gray-900 placeholder:text-[#707070]"
          />
        </InputContainer>
        <Button
          type="submit"
          disabled={!cardName.trim() || isSubmitting}
          loading={isSubmitting}
          buttonType="icon"
          icon={<Plus size={20} />}
          className="min-h-[44px]"
          aria-label="Add card"
          title="Add card"
        />
      </form>
    </motion.div>
  );
}
