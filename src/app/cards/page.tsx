"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HeaderRow } from "@/components/HeaderRow";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CreditCard, Plus, X, ArrowLeft, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CardsPage() {
  const { token } = useAuth();
  const router = useRouter();
    const [cardName, setCardName] = useState("");
  const [fromCard, setFromCard] = useState("");
  const [toCard, setToCard] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const addCardMutation = useMutation(api.cardsAndIncome.addCard);
  const deleteCardMutation = useMutation(api.cardsAndIncome.deleteCard);
  const transferFundsMutation = useMutation(api.cardsAndIncome.transferFunds);
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");

  const addCard = async () => {
    if (!cardName.trim()) return;

    setIsSubmitting(true);
    try {
      await addCardMutation({ token: token!, name: cardName.trim() });
      toast.success("Card added successfully!");
      setCardName("");
    } catch (error) {
      toast.error("Failed to add card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await deleteCardMutation({ token: token!, cardId: cardId as any });
      toast.success("Card deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete card");
    }
  };

  const handleTransfer = async () => {
    if (!fromCard || !toCard || !amount) {
      toast.error("Please fill all transfer fields.");
      return;
    }

    if (fromCard === toCard) {
      toast.error("Cannot transfer to the same card.");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Invalid transfer amount.");
      return;
    }

    setIsTransferring(true);
    try {
      await transferFundsMutation({
        token: token!,
        fromCardId: fromCard as any,
        toCardId: toCard as any,
        amount: transferAmount,
      });
      toast.success("Funds transferred successfully!");
      setFromCard("");
      setToCard("");
      setAmount("");
    } catch (error: any) {
      toast.error(error.data || "Failed to transfer funds");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCard();
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
          left={
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft size={20} />
              </motion.button>
              <h1 className="text-xl font-bold text-gray-900">Manage My Cards</h1>
            </>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          {/* Add Card Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Card</h2>
              <p className="text-sm text-gray-600">Add a card to track expenses and income</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={addCard}
                    disabled={!cardName.trim() || isSubmitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center"
                  >
                    <Plus size={20} />
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Manage Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Transfer Funds</h2>
              <p className="text-sm text-gray-600">Move money between your cards</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <select
                  value={fromCard}
                  onChange={(e) => setFromCard(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                >
                  <option value="">From Card</option>
                  {cards?.map((card) => (
                    <option key={card._id} value={card._id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                <ArrowRight size={20} className="text-gray-400" />
                <select
                  value={toCard}
                  onChange={(e) => setToCard(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                >
                  <option value="">To Card</option>
                  {cards?.map((card) => (
                    <option key={card._id} value={card._id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>
              <CurrencyInput
                value={amount}
                onChangeValue={(val) => setAmount(val)}
                placeholder="Amount"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleTransfer}
                disabled={!fromCard || !toCard || !amount || isTransferring}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
              >
                {isTransferring ? "Transferring..." : "Transfer"}
              </motion.button>
            </div>
          </motion.div>

          {/* My Cards List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Cards</h2>
              <p className="text-sm text-gray-600">
                {cards?.length || 0} card{cards?.length !== 1 ? "s" : ""} added
              </p>
            </div>

            {cards === undefined ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : cards?.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">No cards added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards?.map((card) => (
                  <motion.div
                    key={card._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <CreditCard className="text-blue-600" size={24} />
                      <div>
                        <span className="text-gray-900 font-medium">{card.name}</span>
                        <div className="text-sm text-gray-500">
                          Added {new Date(card.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => deleteCard(card._id)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
