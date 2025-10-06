"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { toast } from "sonner";
import { DollarSign, ArrowLeft, TrendingUp, CreditCard, Calendar, PencilLine, Briefcase, Tag } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTimeFramedData } from "@/hooks/useTimeFramedData";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { IncomeCard } from "@/components/cards/IncomeCard";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import InputContainer from "@/components/InputContainer";
import { Button } from "@/components/Button";

interface IncomeFormData {
  amount: string;
  source: string;
  category: string[];
  date: Date;
  cardId: string;
  notes: string;
}

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function IncomePage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<IncomeFormData>({
    amount: "",
    source: "",
    category: [],
    date: new Date(),
    cardId: "",
    notes: "",
  });
    const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  // Mutations
    const createIncomeMutation = useMutation(api.cardsAndIncome.createIncome);
  const deleteIncomeMutation = useMutation(api.cardsAndIncome.deleteIncome);

  // Queries
  const cardsQuery = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");
  const allIncomeCategoriesQuery = useQuery(api.cardsAndIncome.getUniqueIncomeCategories, token ? { token } : "skip");
  
  // Get offline backup data
  const { 
    cards: offlineCards,
    categories: offlineCategories
  } = useOfflineFirstData();
  
  // Use online data if available, otherwise use offline backup
  const cards = cardsQuery !== undefined ? cardsQuery : (offlineCards as any[])?.map((card: any) => ({
    _id: card.cardId,
    name: card.cardName,
    userId: '',
    createdAt: 0,
    _creationTime: 0
  }));
  
  // Extract income category names from offline categories
  const offlineIncomeCategoryNames = offlineCategories 
    ? (offlineCategories as any[])
        .filter((cat: any) => cat.type === 'income')
        .map((cat: any) => cat.name)
    : [];
  
  const allIncomeCategories = allIncomeCategoriesQuery !== undefined 
    ? allIncomeCategoriesQuery 
    : offlineIncomeCategoryNames;

  const { 
    data: incomes, 
    isLoading,
    monthName, 
    year, 
    goToPreviousMonth, 
    goToNextMonth, 
    refetch,
    isUsingOfflineData 
  } = useTimeFramedData("income", token);

  // Auto-select first card if available
  useEffect(() => {
    if (cards && cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0]._id }));
    }
  }, [cards, formData.cardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.source || formData.category.length === 0) {
      toast.error("Please enter the amount, source, and category.");
      return;
    }
    
    if (!formData.cardId) {
      toast.error("Please select the card where you received this income.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid income amount.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createIncomeMutation({
        token: token!,
        amount,
        source: formData.source,
        category: formData.category[0],
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId as any,
        notes: formData.notes,
      });

      toast.success("Your income has been added.");
      refetch(); // Refetch income after adding a new one
      
      // Reset form
      setFormData({
        amount: "",
        source: "",
        category: [],
        date: new Date(),
        cardId: formData.cardId, // Keep the same card selected
        notes: "",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "There was an error adding your income. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!allIncomeCategories) return [];
    return allIncomeCategories.filter((cat: string) => cat.toLowerCase().includes(query.toLowerCase()));
  };

  // Create a map of card IDs to card names for quick lookup
  const cardMap = cards?.reduce((acc, card) => {
    acc[card._id] = card.name;
    return acc;
  }, {} as Record<string, string>) || {};

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader />
        
        <div className="max-w-lg mx-auto p-4 pt-[92px] pb-24">
          {/* Input Form Section - header + fields (no card wrapper) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Income</h2>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">Fill in the details below to track your income</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form fields... */}
              {/* Amount */}
              <div>
                <CurrencyInput
                  value={formData.amount}
                  onChangeValue={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Source */}
              <div>
                <InputContainer leftIcon={Briefcase}>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className={`w-full bg-transparent outline-none placeholder:text-gray-500 ${formData.source ? 'font-medium text-gray-900' : 'font-normal text-gray-900'}`}
                    placeholder="Source (e.g., Salary, Freelance)"
                    required
                  />
                </InputContainer>
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
                label="Category *"
                multiple={false}
                value={formData.category}
                onChange={(newCategory) => setFormData({ ...formData, category: newCategory })}
                fetchSuggestions={fetchCategorySuggestions}
                onCreateNew={async () => {}}
                formatNewItem={capitalizeWords}
                placeholder="Select or add a category"
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

              {/* Notes */}
              <div className="rounded-[10px] border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]">
                <div className="px-4 py-3">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`w-full bg-transparent outline-none placeholder:text-gray-500 resize-none min-h-[88px] ${formData.notes ? 'font-medium text-gray-900' : 'font-normal text-gray-900'}`}
                    placeholder="Notes (Optional)"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
                disabled={isSubmitting || formData.category.length === 0 || !formData.cardId}
                loading={isSubmitting}
              >
                Add Income
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
                Showing income from your last backup. New income will sync when online.
              </div>
            </motion.div>
          )}

          {/* Income History Section - wrapped */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
            <DateFilterHeader 
              monthName={monthName} 
              year={year} 
              onPreviousMonth={goToPreviousMonth} 
              onNextMonth={goToNextMonth} 
              subtitle="Income History"
              variant="card"
            />

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading income...</div>
            ) : incomes && incomes.length > 0 ? (
              <div className="space-y-2 mt-4">
                {(incomes as Doc<"income">[] | undefined)?.filter(income => !pendingDeletions.includes(income._id)).map((incomeRecord) => (
                  <IncomeCard
                    key={incomeRecord._id}
                    income={incomeRecord}
                    cardName={cardMap[incomeRecord.cardId] || 'Unknown Card'}
                    onDelete={(incomeId: Id<"income">) => {
                      setPendingDeletions(prev => [...prev, incomeId]);

                      const toastId = toast.success("Income deleted", {
                        action: {
                          label: "Undo",
                          onClick: () => {
                            setPendingDeletions(prev => prev.filter(id => id !== incomeId));
                            toast.dismiss(toastId);
                          },
                        },
                        onAutoClose: async () => {
                          try {
                            await deleteIncomeMutation({ token: token!, incomeId: incomeId as any });
                            refetch();
                          } catch (error) {
                            console.error("Failed to delete income:", error);
                            toast.error("Failed to delete income.");
                            setPendingDeletions(prev => prev.filter(id => id !== incomeId));
                          }
                        },
                        duration: 5000,
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">You have no income recorded for this month.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the form above to add an income record.
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

