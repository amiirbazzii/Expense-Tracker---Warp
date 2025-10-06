"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import {
  CreditCard,
  Receipt,
  Tag,
  User,
  Type
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTimeFramedData } from "@/hooks/useTimeFramedData";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineQueue, OfflineItem } from "@/hooks/useOfflineQueue";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";

type ExpenseCreationData = {
  amount: number;
  title: string;
  category: string[];
  for: string[];
  date: number;
  cardId: Id<"cards">;
};

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: Date;
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
    date: new Date(),
    cardId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  const isOnline = useOnlineStatus();
  const {
    queue: offlineExpenses,
    addToQueue,
    removeFromQueue,
    updateItemStatus
  } = useOfflineQueue<ExpenseCreationData>('offline-expenses');

  // Remove all authentication loading logic - let ProtectedRoute handle it

  // Mutations
  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);
  const deleteExpenseMutation = useMutation(api.expenses.deleteExpense);

  // Queries
  const cardsQuery = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const categoriesQuery = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValuesQuery = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  // Get offline backup data for categories and forValues
  const {
    categories: offlineCategories,
    forValues: offlineForValues,
    cards: offlineCards,
    isLoading: isOfflineDataLoading
  } = useOfflineFirstData();

  // Use online data if available, otherwise use offline backup
  // Transform offline cards data to match getMyCards structure
  const cards = cardsQuery !== undefined ? cardsQuery : (offlineCards as any[])?.map((card: any) => ({
    _id: card.cardId,
    name: card.cardName,
    userId: '',
    createdAt: 0,
    _creationTime: 0
  }));
  const categories = categoriesQuery !== undefined ? categoriesQuery : offlineCategories;
  const forValues = forValuesQuery !== undefined ? forValuesQuery : offlineForValues;

  // Check if cards data is still loading
  const isCardsLoading = cardsQuery === undefined && isOfflineDataLoading;

  const {
    currentDate,
    data: expenses,
    isLoading,
    monthName,
    year,
    goToPreviousMonth,
    goToNextMonth,
    refetch,
    isUsingOfflineData
  } = useTimeFramedData('expense', token);

  // Sync offline expenses when online
  useEffect(() => {
    if (isOnline && offlineExpenses.length > 0 && !isSyncing) {
      const syncOfflineExpenses = async () => {
        setIsSyncing(true);
        const itemsToSync = offlineExpenses.filter(item => item.status === 'pending');

        if (itemsToSync.length === 0) {
          setIsSyncing(false);
          return;
        }

        toast.info(`Syncing ${itemsToSync.length} offline expense(s)...`);

        try {
          const syncPromises = itemsToSync.map(async (item) => {
            try {
              await createExpenseMutation({ token: token!, ...item.data });
              removeFromQueue(item.id);
            } catch (error) {
              console.error(`Failed to sync expense ${item.id}:`, error);

              // Check if it's an authentication error
              if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = (error as any).message || '';
                if (errorMessage.includes('Authentication required') || errorMessage.includes('authentication')) {
                  toast.error("Your session has expired during sync. Please log in again.");
                  router.push('/login');
                  return;
                }
              }

              updateItemStatus(item.id, 'failed');
            }
          });

          await Promise.all(syncPromises);

          toast.success("Sync process completed.");
          refetch();
        } finally {
          setIsSyncing(false);
        }
      };
      syncOfflineExpenses();
    }
  }, [isOnline, offlineExpenses, isSyncing, token, createExpenseMutation, removeFromQueue, updateItemStatus, refetch]);

  const handleRetrySync = async (itemId: string) => {
    const itemToRetry = offlineExpenses.find(item => item.id === itemId);
    if (!itemToRetry) return;

    toast.info(`Retrying to sync expense: ${itemToRetry.data.title}`);
    try {
      await createExpenseMutation({ token: token!, ...itemToRetry.data });
      removeFromQueue(itemToRetry.id);
      toast.success("Expense synced successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to sync expense:", error);
      updateItemStatus(itemToRetry.id, 'failed');
      toast.error("Sync failed again. Please check your connection or the data.");
    }
  };

  // Check if user needs to set up cards first
  // Only redirect after data has finished loading to avoid false positives
  useEffect(() => {
    if (!isCardsLoading && cards !== undefined && cards.length === 0) {
      console.log('ExpensesPage: No cards found, redirecting to onboarding');
      router.push("/onboarding");
    }
  }, [cards, router, isCardsLoading]);

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0]._id }));
    }
  }, [cards, formData.cardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.title || formData.category.length === 0) {
      toast.error("Please enter the amount, title, and category.");
      return;
    }

    if (!formData.cardId) {
      toast.error("Please select the card used for this expense.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    const parsedDate = new Date(formData.date);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Please enter a valid date.");
      return;
    }

    setIsSubmitting(true);

    const expenseData: ExpenseCreationData = {
      amount,
      title: formData.title,
      category: formData.category,
      for: formData.for,
      date: parsedDate.getTime(),
      cardId: formData.cardId as any,
    };

    try {
      if (isOnline) {
        await createExpenseMutation({ token: token!, ...expenseData });
        toast.success("Your expense has been added.");
        refetch(); // Refetch expenses after adding a new one
      } else {
        addToQueue(expenseData);
        toast.success("You are offline. Expense saved locally and will be synced later.");
      }

      // Reset form
      setFormData({
        amount: "",
        title: "",
        category: [],
        for: [],
        date: new Date(),
        cardId: formData.cardId, // Keep the same card selected
      });
    } catch (error: unknown) {
      console.error('Error creating expense:', error);

      // Check if it's an authentication error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message || '';
        if (errorMessage.includes('Authentication required') || errorMessage.includes('authentication')) {
          toast.error("Your session has expired. Please log in again.");
          router.push('/login');
          return;
        }
      }

      toast.error("Could not add your expense. Please try again.");
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

  const mappedOfflineExpenses = offlineExpenses.map(item => ({
    ...item.data,
    _id: item.id,
    _creationTime: item.createdAt,
    userId: '', // This is a mock, userId is not available offline
    status: item.status,
  }));

  const combinedExpenses = [...(expenses || []), ...mappedOfflineExpenses]
    .filter(expense => !pendingDeletions.includes(expense._id))
    .sort((a, b) => b.date - a.date);

  // Only show loading if we're online and still waiting for data
  // When offline, we should have offlineCards (even if empty array)
  if (cards === undefined && isOnline) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-black">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader />

        <div className="max-w-lg mx-auto p-4 pt-[92px] pb-24">
          {/* Input Form Section - header + fields (no card wrapper) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Expense</h2>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">Fill in the details below to track your expense</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form fields... */}
              {/* Amount */}
              <div>
                <CurrencyInput
                  value={formData.amount}
                  onChangeValue={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Add a title"
                  icon={Type}
                  required
                />
              </div>

              {/* Card Selection */}
              <div>
                <InputContainer
                  leftIcon={CreditCard}
                  rightAdornment={(
                    <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                >
                  <select
                    value={formData.cardId}
                    onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                    className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                    required
                  >
                    <option value="">Select card</option>
                    {cards?.map((card) => (
                      <option key={card._id} value={card._id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </InputContainer>
              </div>

              <SmartSelectInput
                icon={Tag}
                name="category"
                label="Categories *"
                multiple
                value={formData.category}
                onChange={(newCategories) => setFormData({ ...formData, category: newCategories })}
                fetchSuggestions={fetchCategorySuggestions}
                onCreateNew={handleCreateCategory}
                formatNewItem={capitalizeWords}
                placeholder="Choose category"
              />

              <SmartSelectInput
                icon={User}
                name="for"
                label="For (Optional)"
                multiple={false}
                value={formData.for}
                onChange={(newFor) => setFormData({ ...formData, for: newFor })}
                fetchSuggestions={fetchForSuggestions}
                onCreateNew={handleCreateForValue}
                formatNewItem={capitalizeWords}
                placeholder="Who is this for"
                rightText="Optional"
              />

              {/* Date */}
              <CustomDatePicker
                label="Date *"
                value={format(formData.date, "yyyy-MM-dd")}
                onChange={(dateString) => {
                  const [year, month, day] = dateString.split('-').map(Number);
                  const newDate = new Date(formData.date);
                  newDate.setFullYear(year, month - 1, day);
                  setFormData({ ...formData, date: newDate });
                }}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
                disabled={isSubmitting || formData.category.length === 0 || !formData.cardId}
                loading={isSubmitting}
              >
                Add Expense
              </Button>
            </form>
          </motion.div>

          {/* Offline Mode Indicator */}
          {isUsingOfflineData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center space-x-2 text-sm text-orange-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
                <span>Viewing Offline Backup Data</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Showing expenses from your last backup. New expenses will sync when online.
              </div>
            </motion.div>
          )}

          {/* Expenses History Section - wrapped in a light container */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
            <DateFilterHeader
              monthName={monthName}
              year={year}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              subtitle="Expense History"
              variant="card"
            />

            {isLoading && combinedExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading expenses...</div>
            ) : combinedExpenses.length > 0 ? (
              <div className="space-y-2 mt-4">
                {combinedExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense._id}
                    expense={expense as any}
                    cardName={cardMap[expense.cardId!] || 'Unknown Card'}
                    onDelete={(expenseId: Id<"expenses">) => {
                      setPendingDeletions(prev => [...prev, expenseId]);

                      const toastId = toast.success("Expense deleted", {
                        action: {
                          label: "Undo",
                          onClick: () => {
                            setPendingDeletions(prev => prev.filter(id => id !== expenseId));
                            toast.dismiss(toastId);
                          },
                        },
                        onAutoClose: async () => {
                          try {
                            await deleteExpenseMutation({ token: token!, expenseId: expenseId as any });
                            refetch();
                          } catch (error) {
                            console.error("Failed to delete expense:", error);
                            toast.error("Failed to delete expense.");
                            setPendingDeletions(prev => prev.filter(id => id !== expenseId));
                          }
                        },
                        duration: 5000,
                      });
                    }}
                    status={(expense as any).status}
                    onRetry={handleRetrySync}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">You have no expenses recorded for this month.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the form above to add an expense.
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
