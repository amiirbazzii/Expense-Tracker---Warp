"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppHeader from "@/components/AppHeader";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CreditCard, Plus, X, Trash2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/Button";
import { InputContainer } from "@/components/InputContainer";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import { CardActionMenu } from "./CardActionMenu";

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
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  const addCardMutation = useMutation(api.cardsAndIncome.addCard);
  const deleteCardMutation = useMutation(api.cardsAndIncome.deleteCard);
  const transferFundsMutation = useMutation(api.cardsAndIncome.transferFunds);
  const cardBalancesQuery = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");
  
  // Get offline backup data
  const { cards: offlineCards, isUsingOfflineData } = useOfflineFirstData();
  
  // Use online data if available, otherwise use offline backup
  const cardBalances = cardBalancesQuery !== undefined ? cardBalancesQuery : offlineCards;

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

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuRef.current && !openMenuRef.current.contains(event.target as Node)) {
        setOpenMenuCardId(null);
      }
    }
    if (openMenuCardId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuCardId]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader title="Manage Cards" />
        
        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          {/* Offline Mode Indicator */}
          {isUsingOfflineData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center space-x-2 text-sm text-orange-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
                <span>Viewing Offline Backup Data</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Showing cards from your last backup. Changes require internet connection.
              </div>
            </motion.div>
          )}
          
          {/* Add Card Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
          >
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Add New Card</h2>
              <p className="text-sm text-gray-600">Enter a name for your new card</p>
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
                  onKeyPress={handleKeyPress}
                  placeholder="Card name ..."
                  className="w-full bg-transparent outline-none border-0 text-gray-900 placeholder:text-[#707070]"
                />
              </InputContainer>
              <Button
                type="submit"
                disabled={!cardName.trim() || isSubmitting || isUsingOfflineData}
                loading={isSubmitting}
                buttonType="icon"
                icon={<Plus size={20} />}
                className="min-h-[44px]"
                aria-label="Add card"
                title={isUsingOfflineData ? "Requires internet connection" : "Add card"}
              />
            </form>
          </motion.div>

          {/* Transfer Funds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
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
                disabled={!fromCard || !toCard || !amount || isTransferring || isUsingOfflineData}
                loading={isTransferring}
                className="w-full min-h-[44px]"
                title={isUsingOfflineData ? "Requires internet connection" : "Transfer funds"}
              >
                {isUsingOfflineData ? "Transfer (Offline)" : "Transfer"}
              </Button>
            </div>
          </motion.div>

          {/* My Cards List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
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
                  <div
                    key={card.cardId}
                    className="relative"
                    ref={openMenuCardId === (card.cardId as any) ? openMenuRef : null}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setOpenMenuCardId(prev => (prev === (card.cardId as any) ? null : (card.cardId as any)))}
                      aria-label={`Card ${card.cardName}`}
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="font-semibold text-gray-900">{card.cardName}</div>
                        <div className={`text-base font-bold ${card.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {settings ? formatCurrency(card.balance, settings.currency) : `$${card.balance.toFixed(2)}`}
                        </div>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="flex items-center justify-start gap-6 px-4 py-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                          {settings ? formatCurrency(card.totalIncome, settings.currency) : `$${card.totalIncome.toFixed(2)}`}
                        </span>
                        <span className="flex items-center">
                          <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                          {settings ? formatCurrency(card.totalExpenses, settings.currency) : `$${card.totalExpenses.toFixed(2)}`}
                        </span>
                      </div>
                    </motion.div>
                    <AnimatePresence>
                      {openMenuCardId === (card.cardId as any) && (
                        <CardActionMenu
                          onDelete={() => {
                            if (isUsingOfflineData) {
                              toast.error("Requires internet connection");
                              return;
                            }
                            deleteCard(card.cardId);
                            setOpenMenuCardId(null);
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
