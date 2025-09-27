"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HeaderRow } from "@/components/HeaderRow";
import { CreditCard, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export default function OnboardingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cardName, setCardName] = useState("");
  const [cards, setCards] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCardMutation = useMutation(api.cardsAndIncome.addCard);

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
      // Create all cards
      for (const cardName of cards) {
        await addCardMutation({ token: token!, name: cardName });
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
      <div className="min-h-screen bg-gray-50">
        <HeaderRow
          left={<h1 className="text-xl font-bold text-gray-900">Account Setup</h1>}
        />
        
        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="text-center mb-6">
              <CreditCard className="mx-auto text-blue-600 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Add Your Cards
              </h2>
              <p className="text-gray-600">
                Add the cards you'll use to track your finances.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Name
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                    placeholder="e.g., Chase Visa, Bank of America"
                  />
                  <Button
                    type="button"
                    onClick={addCard}
                    disabled={!cardName.trim()}
                    buttonType="icon"
                    icon={<Plus size={20} />}
                    className="min-h-[44px]"
                    aria-label="Add card"
                  />
                </div>
              </div>

              {/* Cards List */}
              {cards.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Your Cards ({cards.length})
                  </label>
                  <div className="space-y-2">
                    {cards.map((card, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                      >
                        <div className="flex items-center space-x-2">
                          <CreditCard className="text-blue-600" size={20} />
                          <span className="text-gray-900">{card}</span>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeCard(index)}
                          className="text-red-600 hover:text-red-700 p-1"
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
                  disabled={isSubmitting || cards.length === 0}
                  loading={isSubmitting}
                  className="w-full min-h-[44px]"
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
