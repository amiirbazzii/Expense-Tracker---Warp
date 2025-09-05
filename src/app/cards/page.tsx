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
import { CreditCard, Plus, X, ArrowLeft, Trash2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/Button";

export default function CardsPage() {
  const { token } = useAuth();
  const { settings } = useSettings();
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
  const cardBalances = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");

  const addCard = async () => {
    if (!cardName.trim()) return;

    setIsSubmitting(true);
    try {
      await addCardMutation({ token: token!, name: cardName.trim() });
      toast.success("Your card has been added.");
      setCardName("");
    } catch (error) {
      toast.error("There was an error adding your card. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await deleteCardMutation({ token: token!, cardId: cardId as any });
      toast.success("The card has been deleted.");
    } catch (error: any) {
      toast.error(error.message || "There was an error deleting the card.");
    }
  };

  const handleTransfer = async () => {
    if (!fromCard || !toCard || !amount) {
      toast.error("Please select both cards and enter an amount.");
      return;
    }

    if (fromCard === toCard) {
      toast.error("Source and destination cards cannot be the same.");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount to transfer.");
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
      toast.success("Transfer successful.");
      setFromCard("");
      setToCard("");
      setAmount("");
    } catch (error: any) {
      toast.error(error.data || "The transfer could not be completed. Please try again.");
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
              <h1 className="text-xl font-bold text-gray-900">Manage Cards</h1>
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
              <p className="text-sm text-gray-600">Enter a name for your new card</p>
            </div>
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <div className="relative flex-grow">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Personal, Work"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                />
              </div>
              <Button
                type="submit"
                disabled={!cardName.trim() || isSubmitting}
                loading={isSubmitting}
                buttonType="icon"
                icon={<Plus size={20} />}
                className="min-h-[44px]"
                aria-label="Add card"
              />
            </form>
          </motion.div>

          {/* Transfer Funds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Transfer Funds</h2>
              <p className="text-sm text-gray-600">Move money between your cards</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <select
                  value={fromCard}
                  onChange={(e) => setFromCard(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                >
                  <option value="">From Card</option>
                  {cardBalances?.map((card) => (
                    <option key={card.cardId} value={card.cardId}>
                      {card.cardName}
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
                  {cardBalances?.map((card) => (
                    <option key={card.cardId} value={card.cardId}>
                      {card.cardName}
                    </option>
                  ))}
                </select>
              </div>
              <CurrencyInput
                value={amount}
                onChangeValue={(val) => setAmount(val)}
                placeholder="Amount"
              />
              <Button
                onClick={handleTransfer}
                disabled={!fromCard || !toCard || !amount || isTransferring}
                loading={isTransferring}
                className="w-full min-h-[44px]"
              >
                Transfer
              </Button>
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
              <h2 className="text-lg font-semibold text-gray-900">Your Cards ({cardBalances?.length || 0})</h2>
            </div>

            {cardBalances === undefined ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading your cards...</div>
              </div>
            ) : cardBalances?.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">You haven't added any cards yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cardBalances?.map((card) => (
                  <motion.div
                    key={card.cardId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex flex-1 items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="text-blue-600" size={16} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 flex-1">{card.cardName}</div>
                          <div className={`text-base flex-none font-bold ${card.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {settings ? formatCurrency(card.balance, settings.currency) : `$${card.balance.toFixed(2)}`}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-3">
                          <span className="flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                            {settings ? formatCurrency(card.totalIncome, settings.currency) : `$${card.totalIncome.toFixed(2)}`}
                          </span>
                          <span className="flex items-center">
                            <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                            {settings ? formatCurrency(card.totalExpenses, settings.currency) : `$${card.totalExpenses.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteCard(card.cardId)}
                        className="text-red-600 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Card"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
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
