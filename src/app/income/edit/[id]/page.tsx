"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ArrowLeft, Calendar, DollarSign, CreditCard } from "lucide-react";
import { HeaderRow } from "@/components/HeaderRow";
import { format } from "date-fns";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";

interface IncomeFormData {
  amount: string;
  source: string;
  category: string[];
  date: string;
  cardId: string;
  notes: string;
}

export default function EditIncomePage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();

  const incomeId = id as Id<"income">;

  const [formData, setFormData] = useState<IncomeFormData>({
    amount: "",
    source: "",
    category: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const updateIncomeMutation = useMutation(api.cardsAndIncome.updateIncome);
  const income = useQuery(api.cardsAndIncome.getIncomeById, token ? { token, incomeId } : "skip");
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const incomeCategories = useQuery(api.cardsAndIncome.getUniqueIncomeCategories, token ? { token } : "skip");

  useEffect(() => {
    if (income) {
      setFormData({
        amount: income.amount.toString(),
        source: income.source,
        category: [income.category],
        date: format(new Date(income.date), "yyyy-MM-dd"),
        cardId: income.cardId,
        notes: income.notes || "",
      });
      setIsLoading(false);
    }
  }, [income]);

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!incomeCategories) return [];
    return incomeCategories
      .filter(cat => cat.toLowerCase().includes(query.toLowerCase()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.source || formData.category.length === 0 || !formData.cardId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateIncomeMutation({
        token: token!,
        incomeId,
        amount,
        source: formData.source,
        category: formData.category[0],
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId as Id<"cards">,
        notes: formData.notes,
      });

      toast.success("Income updated successfully!");
      router.push("/income");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update income";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-900">Edit Income</h1>
            </>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit Income Details</h2>
              <p className="text-sm text-gray-600">Update the information below</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source *
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Salary, Freelance, etc."
                  required
                />
              </div>

              <SmartSelectInput
                name="category"
                label="Category *"
                multiple={false}
                value={formData.category}
                onChange={(newCategory) => setFormData({ ...formData, category: newCategory })}
                fetchSuggestions={fetchCategorySuggestions}
                placeholder="Select or add a category"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="inline w-4 h-4 mr-1" />
                  Card *
                </label>
                <select
                  value={formData.cardId}
                  onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="" disabled>Select a card</option>
                  {cards?.map(card => (
                    <option key={card._id} value={card._id}>{card.name}</option>
                  ))}
                </select>
              </div>

              <CustomDatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Add any notes here..."
                  rows={3}
                />
              </div>

              <div className="pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Updating..." : "Update Income"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
