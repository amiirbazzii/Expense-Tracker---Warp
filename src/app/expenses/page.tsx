"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { 
  CreditCard, 
  Receipt, 
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTimeFramedData } from "@/hooks/useTimeFramedData";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { Doc } from "../../../convex/_generated/dataModel";
import { ExpenseCard } from '@/components/cards/ExpenseCard';

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
  cardId: string;
}

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function ExpensesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);

  // Queries
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  const { 
    currentDate, 
    data: expenses, 
    isLoading,
    goToPreviousMonth, 
    goToNextMonth, 
    refetch 
  } = useTimeFramedData('expense', token);

  // Check if user needs to set up cards first
  useEffect(() => {
    if (cards !== undefined && cards.length === 0) {
      router.push("/onboarding");
    }
  }, [cards, router]);

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0]._id }));
    }
  }, [cards, formData.cardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.title || formData.category.length === 0) {
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
      await createExpenseMutation({
        token: token!,
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for,
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId as any,
      });

      toast.success("Expense added successfully!");
      refetch(); // Refetch expenses after adding a new one
      
      // Reset form
      setFormData({
        amount: "",
        title: "",
        category: [],
        for: [],
        date: format(new Date(), "yyyy-MM-dd"),
        cardId: formData.cardId, // Keep the same card selected
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add expense";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!categories) return [];
    return categories
      .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map(cat => cat.name);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createCategoryMutation({ token, name });
    } catch (error) {
      toast.error("Failed to create category.");
      console.error(error);
    }
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter(f => f.value.toLowerCase().includes(query.toLowerCase()))
      .map(f => f.value);
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createForValueMutation({ token, value });
    } catch (error) {
      toast.error("Failed to add 'for' value.");
      console.error(error);
    }
  };

  // Create a map of card IDs to card names for quick lookup
  const cardMap = cards?.reduce((acc, card) => {
    acc[card._id] = card.name;
    return acc;
  }, {} as Record<string, string>) || {};

  if (cards === undefined) {
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
          left={<h1 className="text-xl font-bold text-gray-900">Expenses</h1>}
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          {/* Input Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add New Expense</h2>
              <p className="text-sm text-gray-600">Fill in the details below to track your expense</p>
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  placeholder="Lunch, Gas, etc."
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
                label="Categories *"
                multiple
                value={formData.category}
                onChange={(newCategories) => setFormData({ ...formData, category: newCategories })}
                fetchSuggestions={fetchCategorySuggestions}
                onCreateNew={handleCreateCategory}
                formatNewItem={capitalizeWords}
                placeholder="Select or add categories"
              />

              <SmartSelectInput
                name="for"
                label="For (optional)"
                multiple={false}
                value={formData.for}
                onChange={(newFor) => setFormData({ ...formData, for: newFor })}
                fetchSuggestions={fetchForSuggestions}
                onCreateNew={handleCreateForValue}
                formatNewItem={capitalizeWords}
                placeholder="Select or add a person"
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

              {/* Submit Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || formData.category.length === 0 || !formData.cardId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
              >
                {isSubmitting ? "Adding..." : "Add Expense"}
              </motion.button>
            </form>
          </motion.div>

          {/* Expenses History Section */}
          <div className="mt-8">
            <DateFilterHeader 
              currentDate={currentDate} 
              onPreviousMonth={goToPreviousMonth} 
              onNextMonth={goToNextMonth} 
              title="Expenses History"
            />

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : expenses && expenses.length > 0 ? (
              <div className="space-y-4 mt-4">
                {(expenses as Doc<"expenses">[]).map((expense) => (
                  <ExpenseCard 
                    key={expense._id} 
                    expense={expense} 
                    cardName={cardMap[expense.cardId!] || 'Unknown Card'}
                    onDelete={refetch}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">No expenses found for this month.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add an expense using the form above.
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
