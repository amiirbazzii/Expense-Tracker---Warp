"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { X, Calendar, DollarSign, Tag, User, ArrowLeft, CheckCircle } from "lucide-react";
import { HeaderRow } from "@/components/HeaderRow";
import { format } from "date-fns";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
}

export default function EditExpensePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as Id<"expenses">;

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [forInput, setForInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const updateExpenseMutation = useMutation(api.expenses.updateExpense);
  const expense = useQuery(api.expenses.getExpenseById, token ? { token, expenseId } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  // Load expense data into form when available
  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        title: expense.title,
        category: expense.category,
        for: Array.isArray(expense.for) ? expense.for : (expense.for ? [expense.for] : []),
        date: format(new Date(expense.date), "yyyy-MM-dd"),
      });
      setIsLoading(false);
    }
  }, [expense]);

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
      await updateExpenseMutation({
        token: token!,
        expenseId,
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for,
        date: new Date(formData.date).getTime(),
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
                    {categoryInput && ((suggestedCategories && suggestedCategories.length > 0) || wouldCreateNew) && (
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
                <div className="space-y-2">
                  {/* Selected "for" value */}
                  {formData.for.length > 0 && (
                    <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 text-sm rounded-md">
                      <span className="flex-1">{formData.for.join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, for: [] })}
                        className="ml-2 text-green-600 hover:text-green-800"
                        title="Clear selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  {/* For input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={forInput}
                      onChange={(e) => setForInput(e.target.value)}
                      onKeyPress={handleForKeyPress}
                      onBlur={handleForBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
                      placeholder={formData.for.length > 0 ? "Change selection..." : "Type name and press Enter"}
                    />
                    
                    {/* Suggestions */}
                    {forInput && ((suggestedForValues && suggestedForValues.length > 0) || wouldCreateNewFor) && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                        {/* Existing for value suggestions */}
                        {suggestedForValues?.slice(0, 5).map((forValue) => (
                          <button
                            key={forValue._id}
                            type="button"
                            onClick={() => handleForSelect(forValue.value)}
                            className="w-full text-left px-3 py-2 bg-white text-gray-900 hover:bg-gray-100 text-sm"
                          >
                            {forValue.value}
                          </button>
                        ))}
                        
                        {/* Create new for value option */}
                        {wouldCreateNewFor && (
                          <button
                            type="button"
                            onClick={() => handleForSelect(forInput.trim())}
                            className="w-full text-left px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 text-sm font-medium border-t border-gray-200"
                          >
                            Add "{forInput.trim()}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
