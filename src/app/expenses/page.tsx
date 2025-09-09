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
  const { token, loading } = useAuth();
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

  // Early return if still loading authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!token) {
    router.push('/login');
    return null;
  }

  // Mutations
  const createExpenseMutation = useMutation(api.expenses.createExpense);
  const createCategoryMutation = useMutation(api.expenses.createCategory);
    const createForValueMutation = useMutation(api.expenses.createForValue);
  const deleteExpenseMutation = useMutation(api.expenses.deleteExpense);

  // Queries
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  const { 
    currentDate, 
    data: expenses, 
    isLoading, 
    monthName, 
    year, 
    goToPreviousMonth, 
    goToNextMonth, 
    refetch 
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
      <div className="min-h-screen bg-white">
        <HeaderRow
          left={<h1 className="text-xl font-bold text-gray-900">Expenses</h1>}
        />
        
        <div className="max-w-lg mx-auto p-4 pt-20 pb-24">
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
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
