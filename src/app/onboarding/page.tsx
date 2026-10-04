"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HeaderRow } from "@/components/HeaderRow";
import { CreditCard, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { localDataStore } from "@/lib/store";

export default function OnboardingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cardName, setCardName] = useState("");
  const [cards, setCards] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCard = () => {
    if (cardName.trim()) {
      setCards([...cards, cardName.trim()]);
      setCardName("");
    }
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cards.length === 0) {
      toast.error("Please add at least one card to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create all cards locally
      for (const cardName of cards) {
        await localDataStore.addCard(cardName);
      }

      toast.success("Your cards have been added successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("There was an error saving your cards. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCard();
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-page">
        <HeaderRow
          left={<h1 className="text-xl font-bold text-ink-primary">Account Setup</h1>}
        />
        
        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-raised border border-border-subtle rounded-lg shadow-card p-6 mb-6"
          >
            <div className="text-center mb-6">
              <CreditCard className="mx-auto text-accent mb-4" size={48} />
              <h2 className="text-2xl font-bold text-ink-primary mb-2">
                Add Your Cards
              </h2>
              <p className="text-ink-secondary">
                Add the cards you&apos;ll use to track your finances.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card Input */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-2">
                  Card Name
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 min-w-0 px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-ink-primary bg-surface-raised focus:border-accent min-h-[44px] placeholder-ink-tertiary"
                    placeholder="e.g., Chase Visa, Bank of America"
                  />
                  <Button
                    type="button"
                    onClick={addCard}
                    disabled={!cardName.trim()}
                    buttonType="icon"
                    size="medium"
                    icon={<Plus />}
                    aria-label="Add card"
                    className="shrink-0"
                  />
                </div>
              </div>

              {/* Cards List */}
              {cards.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-ink-primary">
                    Your Cards ({cards.length})
                  </label>
                  <div className="space-y-2">
                    {cards.map((card, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-surface-sunken p-3 rounded-md"
                      >
                        <div className="flex items-center space-x-2">
                          <CreditCard className="text-accent" size={20} />
                          <span className="text-ink-primary">{card}</span>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeCard(index)}
                          className="text-danger hover:text-danger-active p-1 cursor-pointer"
                        >
                          <X size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="medium"
                  disabled={isSubmitting || cards.length === 0}
                  loading={isSubmitting}
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
