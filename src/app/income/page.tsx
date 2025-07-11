"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, TrendingUp, CreditCard, Calendar, PencilLine } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTimeFramedData } from "@/hooks/useTimeFramedData";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { Doc } from "../../../convex/_generated/dataModel";

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
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const allIncomeCategories = useQuery(api.cardsAndIncome.getUniqueIncomeCategories, token ? { token } : "skip");

  const { 
    currentDate, 
    data: income, 
    isLoading,
    goToPreviousMonth, 
    goToNextMonth, 
    refetch 
  } = useTimeFramedData('income', token);

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
      refetch(); // Refetch income after adding a new one
      
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
              {/* Form fields... */}
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

          {/* Income History Section */}
          <div className="mt-8">
            <DateFilterHeader 
              currentDate={currentDate} 
              onPreviousMonth={goToPreviousMonth} 
              onNextMonth={goToNextMonth} 
              title="Income History"
            />

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : income && income.length > 0 ? (
              <div className="space-y-4 mt-4">
                {(income as Doc<"income">[]).map((incomeRecord) => (
                  <motion.div
                    key={incomeRecord._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-800 text-md truncate pr-4">
                          {incomeRecord.source}
                        </h3>
                        <p className="font-bold text-green-600 text-md">
                          +${incomeRecord.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {format(new Date(incomeRecord.date), "MMM d, yyyy")}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <CreditCard className="inline w-4 h-4 mr-1" />
                        {cardMap[incomeRecord.cardId] || "Unknown Card"}
                      </div>
                      <div className="mt-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded-full">
                          {incomeRecord.category}
                        </span>
                      </div>
                      {incomeRecord.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {incomeRecord.notes}
                        </div>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/income/edit/${incomeRecord._id}`)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      aria-label="Edit income"
                    >
                      <ArrowRight size={20} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">No income found for this month.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add an income record using the form above.
                </p>
              </div>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
