"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, CreditCard, Calendar, DollarSign, PencilLine } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface IncomeFormData {
  amount: string;
  source: string;
  category: string[];
  date: string;
  cardId: string;
  notes: string;
}

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function IncomePage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<IncomeFormData>({
    amount: "",
    source: "",
    category: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createIncomeMutation = useMutation(api.cardsAndIncome.createIncome);

  // Queries
  const income = useQuery(api.cardsAndIncome.getIncome, token ? { token } : "skip");
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const allIncomeCategories = useQuery(api.cardsAndIncome.getUniqueIncomeCategories, token ? { token } : "skip");

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0]._id }));
    }
  }, [cards, formData.cardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.source || formData.category.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!formData.cardId) {
      toast.error("Please select a card");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await createIncomeMutation({
        token: token!,
        amount,
        source: formData.source,
        category: formData.category[0],
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId as any,
        notes: formData.notes,
      });

      toast.success("Income added successfully!");
      
      // Reset form
      setFormData({
        amount: "",
        source: "",
        category: [],
        date: format(new Date(), "yyyy-MM-dd"),
        cardId: formData.cardId, // Keep the same card selected
        notes: "",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add income";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!allIncomeCategories) return [];
    return allIncomeCategories.filter((cat: string) => cat.toLowerCase().includes(query.toLowerCase()));
  };

  // Create a map of card IDs to card names for quick lookup
  const cardMap = cards?.reduce((acc, card) => {
    acc[card._id] = card.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const sortedIncome = income?.sort((a, b) => b.date - a.date) || [];

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
              <h1 className="text-xl font-bold text-gray-900">Income</h1>
            </>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          {/* Input Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add New Income</h2>
              <p className="text-sm text-gray-600">Fill in the details below to track your income</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source *
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  placeholder="Salary, Freelance, etc."
                  required
                />
              </div>

              {/* Card Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="inline w-4 h-4 mr-1" />
                  Card *
                </label>
                <select
                  value={formData.cardId}
                  onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  required
                >
                  <option value="">Select a card</option>
                  {cards?.map((card) => (
                    <option key={card._id} value={card._id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>

              <SmartSelectInput
                name="category"
                label="Category *"
                multiple={false}
                value={formData.category}
                onChange={(newCategory) => setFormData({ ...formData, category: newCategory })}
                fetchSuggestions={fetchCategorySuggestions}
                onCreateNew={async () => {}}
                formatNewItem={capitalizeWords}
                placeholder="Select or add a category"
              />

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PencilLine className="inline w-4 h-4 mr-1" />
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[88px]"
                  placeholder="Add any relevant notes..."
                />
              </div>

              {/* Submit Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || formData.category.length === 0 || !formData.cardId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
              >
                {isSubmitting ? "Adding..." : "Add Income"}
              </motion.button>
            </form>
          </motion.div>

          {/* Income History */}
          <h2 className="text-lg font-semibold text-gray-900 my-6">Income History</h2>
          {income === undefined ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : sortedIncome.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No income records found</p>
              <p className="text-sm text-gray-400 mt-2">
                Start by adding your first income record above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedIncome.map((incomeRecord) => (
                <motion.div
                  key={incomeRecord._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {incomeRecord.source}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <CreditCard className="w-4 h-4 mr-1" />
                        <span>{cardMap[incomeRecord.cardId] || "Unknown Card"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        +${incomeRecord.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{format(new Date(incomeRecord.date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {incomeRecord.category}
                    </div>
                  </div>
                  
                  {incomeRecord.notes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Notes:</strong> {incomeRecord.notes}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
