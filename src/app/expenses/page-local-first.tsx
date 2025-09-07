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
  Type,
  Cloud,
  HardDrive,
  Sync
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

// Import new local-first hooks and components
import { useExpenses } from "@/hooks/useLocalFirst";
import { useLocalFirst } from "@/providers/LocalFirstProvider";

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

/**
 * Enhanced ExpensesPage using local-first data patterns
 * Provides immediate UI updates with background cloud synchronization
 */
export default function ExpensesPageLocalFirst() {
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
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  const isOnline = useOnlineStatus();
  
  // Use new local-first hooks
  const {
    data: localExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    syncStatus,
    pendingCount,
    lastSyncedAt,
    error: localFirstError,
    isLoading: localFirstLoading
  } = useExpenses();
  
  const {
    conflictState,
    forceSyncToCloud,
    getSyncStatistics
  } = useLocalFirst();

  // Legacy offline queue for backward compatibility
  const { 
    queue: offlineExpenses, 
    addToQueue, 
    removeFromQueue, 
    updateItemStatus 
  } = useOfflineQueue<ExpenseCreationData>('offline-expenses');

  // Mutations (kept for category/forValue creation)
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);

  // Queries (still needed for categories, cards, etc.)
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");

  // Legacy time-framed data for comparison (can be removed once fully migrated)
  const { 
    currentDate, 
    data: cloudExpenses, 
    isLoading: cloudLoading, 
    monthName, 
    year, 
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

  // Show sync status notifications
  useEffect(() => {
    if (conflictState.hasConflicts) {
      toast.warning("Data sync conflicts detected. Please resolve them.", {
        duration: 5000
      });
    }
  }, [conflictState.hasConflicts]);

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

    const expenseData = {
      amount,
      title: formData.title,
      category: formData.category,
      for: formData.for,
      date: parsedDate.getTime(),
      cardId: formData.cardId,
    };

    try {
      // Use local-first createExpense - immediate UI update
      await createExpense(expenseData);
      
      toast.success(
        isOnline 
          ? "Expense added and syncing to cloud..." 
          : "Expense saved locally. Will sync when online."
      );
      
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
      toast.error("Could not add your expense. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
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
          await deleteExpense(expenseId);
        } catch (error) {
          console.error("Failed to delete expense:", error);
          toast.error("Failed to delete expense.");
          setPendingDeletions(prev => prev.filter(id => id !== expenseId));
        }
      },
      duration: 5000,
    });
  };

  const handleForcSync = async () => {
    try {
      await forceSyncToCloud();
      toast.success("Data synchronized successfully!");
    } catch (error) {
      toast.error("Sync failed. Please try again.");
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

  // Use local-first expenses data with filtering
  const displayedExpenses = localExpenses
    .filter(expense => !pendingDeletions.includes(expense.id))
    .sort((a, b) => b.date - a.date);

  // Sync status indicator component
  const SyncStatusIndicator = () => {
    if (!isOnline) {
      return (
        <div className="flex items-center space-x-2 text-amber-600 text-sm">
          <HardDrive className="w-4 h-4" />
          <span>Offline - {pendingCount} pending</span>
        </div>
      );
    }

    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center space-x-2 text-blue-600 text-sm">
            <Sync className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </div>
        );
      case 'synced':
        return (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <Cloud className="w-4 h-4" />
            <span>Synced</span>
            {lastSyncedAt && (
              <span className="text-gray-500">
                {format(lastSyncedAt, 'HH:mm')}
              </span>
            )}
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <Cloud className="w-4 h-4" />
            <span>Sync failed</span>
            <button
              onClick={handleForcSync}
              className="text-blue-600 underline"
            >
              Retry
            </button>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-600 text-sm">
            <Cloud className="w-4 h-4" />
            <span>{pendingCount} pending</span>
          </div>
        );
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
      <div className="min-h-screen bg-white">
        <HeaderRow
          left={<h1 className="text-xl font-bold text-gray-900">Expenses</h1>}
          right={<SyncStatusIndicator />}
        />
        
        <div className="max-w-lg mx-auto p-4 pt-20 pb-24">
          {/* Input Form Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Expense</h2>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">
                Fill in the details below to track your expense
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Expenses History Section */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
            <DateFilterHeader 
              monthName={monthName} 
              year={year} 
              onPreviousMonth={goToPreviousMonth} 
              onNextMonth={goToNextMonth} 
              subtitle="Expense History"
              variant="card"
            />

            {localFirstLoading && displayedExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading expenses...</div>
            ) : displayedExpenses.length > 0 ? (
              <div className="space-y-2 mt-4">
                {displayedExpenses.map((expense) => (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={{
                      _id: expense.id,
                      amount: expense.amount,
                      title: expense.title,
                      category: expense.category,
                      for: expense.for,
                      date: expense.date,
                      cardId: expense.cardId,
                      _creationTime: expense.createdAt,
                      userId: '' // Mock value
                    } as any} 
                    cardName={cardMap[expense.cardId!] || 'Unknown Card'}
                    onDelete={() => handleDeleteExpense(expense.id)}
                    status={expense.syncStatus}
                    onRetry={() => {/* Handle retry if needed */}}
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

            {/* Show local-first error if any */}
            {localFirstError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{localFirstError}</p>
              </div>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}