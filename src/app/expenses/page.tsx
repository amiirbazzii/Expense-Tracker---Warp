"use client";

import { useState, useMemo, useEffect } from "react";
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
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
  cardId: string;
}

interface IncomeFormData {
  amount: string;
  cardId: string;
  date: string;
  source: string;
  category: string;
  notes: string;
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
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [expenseFormData, setExpenseFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
  });
  const [incomeFormData, setIncomeFormData] = useState<IncomeFormData>({
    amount: "",
    cardId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    source: "",
    category: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const createIncomeMutation = useMutation(api.cardsAndIncome.createIncome);
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);

  // Queries
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  // Check if user needs to set up cards first
  useEffect(() => {
    if (cards !== undefined && cards.length === 0) {
      router.push("/onboarding");
    }
  }, [cards, router]);

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !expenseFormData.cardId && !incomeFormData.cardId) {
      setExpenseFormData(prev => ({ ...prev, cardId: cards[0]._id }));
      setIncomeFormData(prev => ({ ...prev, cardId: cards[0]._id }));
    }
  }, [cards, expenseFormData.cardId, incomeFormData.cardId]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.amount || !expenseFormData.title || expenseFormData.category.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!expenseFormData.cardId) {
      toast.error("Please select a card");
      return;
    }

    const amount = parseFloat(expenseFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await createExpenseMutation({
        token: token!,
        amount,
        title: expenseFormData.title,
        category: expenseFormData.category,
        for: expenseFormData.for,
        date: new Date(expenseFormData.date).getTime(),
        cardId: expenseFormData.cardId as any,
      });

      toast.success("Expense added successfully!");
      
      // Reset form
      setExpenseFormData({
        amount: "",
        title: "",
        category: [],
        for: [],
        date: format(new Date(), "yyyy-MM-dd"),
        cardId: expenseFormData.cardId, // Keep the same card selected
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add expense";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeFormData.amount || !incomeFormData.cardId || !incomeFormData.source || !incomeFormData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(incomeFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await createIncomeMutation({
        token: token!,
        amount,
        cardId: incomeFormData.cardId as any,
        date: new Date(incomeFormData.date).getTime(),
        source: incomeFormData.source,
        category: incomeFormData.category,
        notes: incomeFormData.notes || undefined,
      });

      toast.success("Income added successfully!");
      
      // Reset form
      setIncomeFormData({
        amount: "",
        cardId: incomeFormData.cardId, // Keep the same card selected
        date: format(new Date(), "yyyy-MM-dd"),
        source: "",
        category: "",
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
          left={<h1 className="text-xl font-bold text-gray-900">Expenses & Income</h1>}
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 border-2 border-gray-200">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'expenses'
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-gray-700 hover:bg-white/80 hover:text-gray-900'
                }`}
              >
                <Receipt size={16} className="mr-2" />
                Expenses
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('income')}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'income'
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-gray-700 hover:bg-white/80 hover:text-gray-900'
                }`}
              >
                <TrendingUp size={16} className="mr-2" />
                Income
              </motion.button>
            </div>

            {/* Tab Content */}
            {activeTab === 'expenses' ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Add New Expense</h2>
                  <p className="text-sm text-gray-600">Fill in the details below to track your expense</p>
                </div>
                
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
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
                      value={expenseFormData.title}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
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
                      value={expenseFormData.cardId}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, cardId: e.target.value })}
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
                    value={expenseFormData.category}
                    onChange={(newCategories) => setExpenseFormData({ ...expenseFormData, category: newCategories })}
                    fetchSuggestions={fetchCategorySuggestions}
                    onCreateNew={handleCreateCategory}
                    formatNewItem={capitalizeWords}
                    placeholder="Select or add categories"
                  />

                  <SmartSelectInput
                    name="for"
                    label="For (optional)"
                    multiple={false}
                    value={expenseFormData.for}
                    onChange={(newFor) => setExpenseFormData({ ...expenseFormData, for: newFor })}
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
                      value={expenseFormData.date}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      required
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || expenseFormData.category.length === 0 || !expenseFormData.cardId}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
                  >
                    {isSubmitting ? "Adding..." : "Add Expense"}
                  </motion.button>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Add New Income</h2>
                  <p className="text-sm text-gray-600">Record your income from various sources</p>
                </div>
                
                <form onSubmit={handleIncomeSubmit} className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={incomeFormData.amount}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder="0.00"
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
                      value={incomeFormData.cardId}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, cardId: e.target.value })}
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

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source *
                    </label>
                    <input
                      type="text"
                      value={incomeFormData.source}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder="e.g., Salary, Freelance, Gift"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={incomeFormData.category}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder="e.g., Work, Investment, Gift"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={incomeFormData.date}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={incomeFormData.notes}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder="Additional notes about this income"
                      rows={3}
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || !incomeFormData.cardId}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
                  >
                    {isSubmitting ? "Adding..." : "Add Income"}
                  </motion.button>
                </form>
              </div>
            )}
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
