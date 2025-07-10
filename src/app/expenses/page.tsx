"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Doc } from "convex/_generated/dataModel";
import { useOffline, PendingExpense } from "@/contexts/OfflineContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { X, Calendar, DollarSign, Tag, User, Clock, AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

// A unified type for displaying both online and offline expenses
type DisplayExpense = (Omit<Doc<"expenses">, 'userId'> & { isOffline?: false; status: 'synced' }) | (PendingExpense & { isOffline: true; _id: string; _creationTime: number });

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
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
  const { isOnline, pendingExpenses, addPendingExpense, retryFailedExpense, syncPendingExpenses } = useOffline();
  const router = useRouter();
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);

  const onlineExpenses = useQuery(api.expenses.getExpenses, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  useEffect(() => {
    if (isOnline) {
      syncPendingExpenses();
    }
  }, [isOnline, syncPendingExpenses]);

  const combinedExpenses: DisplayExpense[] = useMemo(() => {
    const offline: DisplayExpense[] = pendingExpenses.map(p => ({ ...p, isOffline: true, _id: p.id, _creationTime: p.date, for: Array.isArray(p.for) ? p.for : [p.for] }));
    const online: DisplayExpense[] = onlineExpenses?.map(o => ({ ...o, status: 'synced', isOffline: false })) || [];
    
    const all = [...offline, ...online];
    
    // Create a set of online expense IDs for efficient lookup
    const onlineIds = new Set(online.map(o => o._id));

    // Use a Map to handle duplicates, ensuring the online version is preferred
    const expenseMap = new Map<string | Id<"expenses">, DisplayExpense>();
    for (const expense of all) {
      expenseMap.set(expense._id, expense);
    }

    return Array.from(expenseMap.values()).sort((a, b) => b._creationTime - a._creationTime);
  }, [pendingExpenses, onlineExpenses]);

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
        for: Array.isArray(formData.for) ? formData.for : formData.for ? [formData.for] : [],
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
        for: [],
        date: format(new Date(), "yyyy-MM-dd"),
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <HeaderRow
          left={<h1 className="text-xl font-bold text-gray-900">Add Expense</h1>}
          right={
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/dashboard")}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Go to Dashboard"
            >
              <BarChart3 size={20} />
            </motion.button>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
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
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
