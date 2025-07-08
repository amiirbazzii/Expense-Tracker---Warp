"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { X, Calendar, DollarSign, Tag, User } from "lucide-react";
import { format } from "date-fns";

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string;
  date: string;
}

export default function ExpensesPage() {
  const { token } = useAuth();
  const { isOnline, addPendingExpense } = useOffline();
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const expenses = useQuery(api.expenses.getExpenses, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.title || formData.category.length === 0) {
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
      const expenseData = {
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for || undefined,
        date: new Date(formData.date).getTime(),
      };

      if (isOnline && token) {
        await createExpenseMutation({
          token,
          ...expenseData,
        });
        toast.success("Expense added successfully!");
      } else {
        // Add to offline queue
        addPendingExpense(expenseData);
        toast.success("Expense saved offline!");
      }

      // Reset form
      setFormData({
        amount: "",
        title: "",
        category: [],
        for: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add expense";
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

  const handleCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCategory(categoryInput);
    }
  };

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <OfflineBanner />
        
        <div className="max-w-md mx-auto p-4 pt-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Expense</h1>
            
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

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="inline w-4 h-4 mr-1" />
                  Categories *
                </label>
                <div className="space-y-2">
                  {/* Selected categories */}
                  {formData.category.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.category.map((cat, index) => (
                        <motion.span
                          key={index}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => removeCategory(index)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  )}
                  
                  {/* Category input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyPress={handleCategoryKeyPress}
                      onBlur={() => {
                        if (categoryInput.trim()) {
                          addCategory(categoryInput);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder="Type category and press Enter"
                    />
                    
                    {/* Suggestions */}
                    {categoryInput && (suggestedCategories?.length > 0 || wouldCreateNew) && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                        {/* Existing category suggestions */}
                        {suggestedCategories?.slice(0, 5).map((cat) => (
                          <button
                            key={cat._id}
                            type="button"
                            onClick={() => selectCategoryFromDropdown(cat.name)}
                            className="w-full text-left px-3 py-2 bg-white text-gray-900 hover:bg-gray-100 text-sm"
                          >
                            {cat.name}
                          </button>
                        ))}
                        
                        {/* Create new category option */}
                        {wouldCreateNew && (
                          <button
                            type="button"
                            onClick={() => addCategory(categoryInput)}
                            className="w-full text-left px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 text-sm font-medium border-t border-gray-200"
                          >
                            Create "{formattedInput}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* For */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  For (optional)
                </label>
                <input
                  type="text"
                  value={formData.for}
                  onChange={(e) => setFormData({ ...formData, for: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                  placeholder="Family, Personal, etc."
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                />
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || formData.category.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
              >
                {isSubmitting ? "Adding..." : "Add Expense"}
              </motion.button>
            </form>
          </motion.div>

          {/* Recent Expenses */}
          {expenses && expenses.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h2>
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{expense.title}</div>
                      <div className="text-sm text-gray-600">
                        {expense.category.join(", ")} • {format(new Date(expense.date), "MMM d")}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">
                      ${expense.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
