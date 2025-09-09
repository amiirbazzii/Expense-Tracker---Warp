"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  CreditCard, 
  Receipt, 
  Tag,
  User,
  Type
} from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";

import { 
  useLocalFirstExpenses, 
  useFilteredExpenses, 
  ExpenseFormData as LocalExpenseFormData 
} from "@/hooks/useLocalFirstExpenses";
import { useLocalFirstMetadata } from "@/hooks/useLocalFirstMetadata";
import { useOfflineFirst } from "@/providers/OfflineFirstProvider";

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

export default function OfflineFirstExpensesPage() {
  const router = useRouter();
  const { isOnline } = useOfflineFirst();
  
  // State for form
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: new Date(),
    cardId: "",
  });
  
  const [currentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  // Local-first hooks
  const { 
    expenses, 
    createExpense, 
    updateExpense, 
    deleteExpense,
    isLoading, 
    syncStatus,
    pendingCount,
    refreshData 
  } = useLocalFirstExpenses({
    startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime(),
    endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime()
  });

  const { 
    cards, 
    expenseCategories, 
    forValues,
    isLoading: metadataLoading 
  } = useLocalFirstMetadata();

  // Filter expenses for display
  const filteredExpenses = useFilteredExpenses(
    expenses.filter(expense => !pendingDeletions.includes(expense.id)),
    searchTerm
  );

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0].id }));
    }
  }, [cards, formData.cardId]);

  // Check if user needs to set up cards first
  useEffect(() => {
    if (!metadataLoading && cards && cards.length === 0) {
      router.push("/onboarding");
    }
  }, [cards, metadataLoading, router]);

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

    const expenseData: LocalExpenseFormData = {
      amount,
      title: formData.title,
      category: formData.category,
      date: parsedDate.getTime(),
      cardId: formData.cardId,
      forValue: formData.for.length > 0 ? formData.for[0] : 'Personal',
      description: '' // Could be added later
    };

    try {
      await createExpense(expenseData);
      
      // Show appropriate success message
      if (isOnline) {
        toast.success("Expense added successfully!");
      } else {
        toast.success("Expense saved offline and will sync when connection is restored.");
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
    } catch (error) {
      toast.error("Could not add your expense. Please try again.");
      console.error(error);
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
          setPendingDeletions(prev => prev.filter(id => id !== expenseId));
        } catch (error) {
          console.error("Failed to delete expense:", error);
          toast.error("Failed to delete expense.");
          setPendingDeletions(prev => prev.filter(id => id !== expenseId));
        }
      },
      duration: 5000,
    });
  };

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!expenseCategories) return [];
    return expenseCategories
      .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map(cat => cat.name);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    // This would create a new category in local storage
    // For now, we'll just accept it as a new category
    toast.info(`Category "${name}" will be created when you're back online.`);
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => f.name);
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    // Similar to categories - accept new values
    toast.info(`"For" value "${value}" will be created when you're back online.`);
  };

  // Create a map of card IDs to card names for quick lookup
  const cardMap = cards?.reduce((acc, card) => {
    acc[card.id] = card.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Show loading state while initializing
  if (metadataLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg">Loading expenses...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <HeaderRow
          left={
            <div>
              <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
              {pendingCount > 0 && (
                <div className="text-xs text-yellow-600 mt-1">
                  {pendingCount} pending sync
                </div>
              )}
            </div>
          }
        />
        
        <div className="max-w-lg mx-auto p-4 pt-20 pb-24">
          {/* Input Form Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Expense</h2>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">
                Fill in the details below to track your expense
                {!isOnline && " (offline mode)"}
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
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </InputContainer>
              </div>

              {/* Categories */}
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

              {/* For */}
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
                disabled={formData.category.length === 0 || !formData.cardId}
              >
                Add Expense {!isOnline && "(Offline)"}
              </Button>
            </form>
          </motion.div>

          {/* Search */}
          <div className="mt-8 mb-4">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="w-full"
            />
          </div>

          {/* Expenses History Section */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
            <DateFilterHeader 
              monthName={monthName} 
              year={year} 
              onPreviousMonth={() => {/* TODO: Implement month navigation */}} 
              onNextMonth={() => {/* TODO: Implement month navigation */}} 
              subtitle="Expense History"
              variant="card"
            />

            {isLoading && filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading expenses...</div>
            ) : filteredExpenses.length > 0 ? (
              <div className="space-y-2 mt-4">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={{
                      ...expense,
                      _id: expense.id,
                      _creationTime: expense.createdAt,
                      userId: 'local'
                    } as any} 
                    cardName={cardMap[expense.cardId] || 'Unknown Card'}
                    onDelete={() => handleDeleteExpense(expense.id)}
                    status={expense.syncStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">
                  {searchTerm ? "No expenses match your search." : "You have no expenses recorded for this month."}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm ? "Try adjusting your search terms." : "Use the form above to add an expense."}
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