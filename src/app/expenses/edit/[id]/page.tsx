"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { X, Calendar, DollarSign, Tag, User, ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { HeaderRow } from "@/components/HeaderRow";
import { format } from "date-fns";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";
import { SmartSelectInput } from "@/components/SmartSelectInput";

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
  cardId: string;
}

export default function EditExpensePage() {
  const { id } = useParams();
  const router = useRouter();

  const { token } = useAuth();
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!categories) return [];
    return categories
      .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map(cat => cat.name);
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter(f => f.value.toLowerCase().includes(query.toLowerCase()))
      .map(f => f.value);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createCategoryMutation({ token, name });
      toast.success(`Category "${name}" created`);
    } catch (error) {
      toast.error("Failed to create category");
      console.error(error);
    }
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createForValueMutation({ token, value });
      toast.success(`For value "${value}" created`);
    } catch (error) {
      toast.error("Failed to create 'for' value");
      console.error(error);
    }
  };

  const params = useParams();
  const expenseId = params.id as Id<"expenses">;

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [forInput, setForInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const updateExpenseMutation = useMutation(api.expenses.updateExpense);
  const expense = useQuery(api.expenses.getExpenseById, token ? { token, expenseId } : "skip");

  // Load expense data into form when available
  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        title: expense.title,
        category: expense.category,
        for: Array.isArray(expense.for) ? expense.for : (expense.for ? [expense.for] : []),
        date: format(new Date(expense.date), "yyyy-MM-dd"),
        cardId: expense.cardId || "",
      });
      setIsLoading(false);
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.title || formData.category.length === 0 || !formData.cardId) {
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
      await updateExpenseMutation({
        token: token!,
        expenseId,
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for,
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId ? (formData.cardId as any) : undefined,
      });

      toast.success("Expense updated successfully!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update expense";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format category name according to rules:
  // - lowercase
  // - no leading/trailing spaces
  // - hyphens between words
  const formatCategoryName = (name: string): string => {
    return name
      .trim() // Remove leading/trailing spaces
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const addCategory = (categoryName: string) => {
    const formatted = formatCategoryName(categoryName);
    if (formatted && !formData.category.includes(formatted)) {
      setFormData({
        ...formData,
        category: [...formData.category, formatted],
      });
    }
    setCategoryInput("");
  };

  // Function specifically for selecting from dropdown (no formatting needed)
  const selectCategoryFromDropdown = (categoryName: string) => {
    if (categoryName && !formData.category.includes(categoryName)) {
      setFormData({
        ...formData,
        category: [...formData.category, categoryName],
      });
    }
    setCategoryInput("");
  };

  const removeCategory = (index: number) => {
    setFormData({
      ...formData,
      category: formData.category.filter((_, i) => i !== index),
    });
  };

  const handleCategoryKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCategory(categoryInput);
    }
  };

  // Functions for handling "For" input
  const handleForSelect = (value: string) => {
    if (!formData.for.includes(value)) {
      setFormData({ ...formData, for: [...formData.for, value] });
    }
    setForInput("");
  };

  const handleForKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (forInput.trim()) {
        handleForSelect(forInput.trim());
      }
    }
  };

  const handleForBlur = () => {
    if (forInput.trim()) {
      handleForSelect(forInput.trim());
    }
  };

  const suggestedForValues = forValues?.filter(
    (forValue) =>
      !formData.for.includes(forValue.value) &&
      forValue.value.toLowerCase().includes(forInput.toLowerCase())
  );

  const wouldCreateNewFor = forInput.trim() &&
    !formData.for.includes(forInput.trim()) &&
    !forValues?.some(forValue => forValue.value === forInput.trim());

  const suggestedCategories = categories?.filter(
    (cat) =>
      !formData.category.includes(cat.name) &&
      cat.name.toLowerCase().includes(categoryInput.toLowerCase())
  );

  // Check if the current input would create a new category
  const formattedInput = formatCategoryName(categoryInput);
  const wouldCreateNew = formattedInput && 
    !formData.category.includes(formattedInput) &&
    !categories?.some(cat => cat.name === formattedInput);

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
              <h1 className="text-xl font-bold text-gray-900">Edit Expense</h1>
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
              <h2 className="text-lg font-semibold text-gray-900">Edit Expense Details</h2>
              <p className="text-sm text-gray-600">Update the information below</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
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

              {/* Card */}
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
                  <option value="" disabled>Select a card</option>
                  {cards?.map(card => (
                    <option key={card._id} value={card._id}>{card.name}</option>
                  ))}
                </select>
              </div>

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

              {/* Submit button */}
              <div className="pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors min-h-[44px]"
                >
                  {isSubmitting ? "Updating..." : "Update Expense"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
