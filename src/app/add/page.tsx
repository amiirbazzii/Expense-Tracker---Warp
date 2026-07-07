"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { Tabs } from "@/components/Tabs";
import {
  CreditCard,
  Receipt,
  Tag,
  User,
  CaseSensitive,
  TrendingUp,
  Type,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useTimeFramedData } from "@/hooks/useTimeFramedData";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { Id } from "../../../convex/_generated/dataModel";
import { ExpenseCard } from "@/components/cards/ExpenseCard";
import { IncomeCard } from "@/components/cards/IncomeCard";
import { EditExpenseSheet } from "@/components/EditExpenseSheet";
import { EditIncomeSheet } from "@/components/EditIncomeSheet";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useOfflineFirst } from "@/providers/OfflineFirstProvider";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import { useLocalData } from "@/hooks/useLocalData";
import { localDataStore } from "@/lib/store";

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
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function AddTransactionContent() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const { localStorageManager } = useOfflineFirst();

  // Tab State
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"expense" | "income">(
    tabParam === "income" ? "income" : "expense",
  );

  // Sync tab active value from URL param if changed
  useEffect(() => {
    if (tabParam === "income" || tabParam === "expense") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: "expense" | "income") => {
    setActiveTab(tab);
    router.replace(`/add?tab=${tab}`, { scroll: false });
  };

  // Form States
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: new Date(),
    cardId: "",
  });

  const [incomeForm, setIncomeForm] = useState<IncomeFormData>({
    amount: "",
    source: "",
    category: [],
    date: new Date(),
    cardId: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingExpenseDeletions, setPendingExpenseDeletions] = useState<
    string[]
  >([]);
  const [pendingIncomeDeletions, setPendingIncomeDeletions] = useState<
    string[]
  >([]);
  const [editingExpenseId, setEditingExpenseId] =
    useState<Id<"expenses"> | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<Id<"income"> | null>(
    null,
  );

  // ── All data from the reactive local store ──────────────────────────────
  const {
    categories,
    forValues,
    cards: localCards,
    income: offlineIncomeData,
  } = useLocalData();

  // Map local card docs to the shape components expect (Convex raw card shape)
  const cards = localCards.map((card) => ({
    _id: card.cardId,
    name: card.cardName,
    userId: "",
    createdAt: 0,
    _creationTime: 0,
  }));

  // Extract unique income category names from local income data
  const allIncomeCategories = Array.isArray(offlineIncomeData)
    ? Array.from(
        new Set(
          offlineIncomeData
            .map((inc) => inc.category)
            .filter((cat) => cat && typeof cat === "string"),
        ),
      )
    : [];

  // Time Framed Data Hooks
  const {
    data: expenses,
    monthName: expenseMonthName,
    year: expenseYear,
    goToPreviousMonth: goToPreviousExpenseMonth,
    goToNextMonth: goToNextExpenseMonth,
    refetch: refetchExpenses,
    isUsingOfflineData: isUsingOfflineExpenseData,
  } = useTimeFramedData("expense", token);

  const {
    data: incomes,
    monthName: incomeMonthName,
    year: incomeYear,
    goToPreviousMonth: goToPreviousIncomeMonth,
    goToNextMonth: goToNextIncomeMonth,
    refetch: refetchIncome,
    isUsingOfflineData: isUsingOfflineIncomeData,
  } = useTimeFramedData("income", token);

  // Auto-select first card
  useEffect(() => {
    if (cards && cards.length > 0) {
      if (!expenseForm.cardId) {
        setExpenseForm((prev) => ({ ...prev, cardId: cards[0]._id }));
      }
      if (!incomeForm.cardId) {
        setIncomeForm((prev) => ({ ...prev, cardId: cards[0]._id }));
      }
    }
  }, [cards, expenseForm.cardId, incomeForm.cardId]);

  // Form Submissions
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !expenseForm.amount ||
      !expenseForm.title ||
      expenseForm.category.length === 0
    ) {
      toast.error("Please enter the amount, title, and category.");
      return;
    }

    if (!expenseForm.cardId) {
      toast.error("Please select the card used for this expense.");
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    const parsedDate = new Date(expenseForm.date);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Please enter a valid date.");
      return;
    }

    setIsSubmitting(true);

    const expenseData: ExpenseCreationData = {
      amount,
      title: expenseForm.title,
      category: expenseForm.category,
      for: expenseForm.for,
      date: parsedDate.getTime(),
      cardId: expenseForm.cardId as any,
    };

    try {
      if (localStorageManager) {
        await localStorageManager.saveExpense(expenseData);
      }

      if (isOnline) {
        await createExpenseMutation({ token: token!, ...expenseData });
        toast.success("Your expense has been added.");
        refetchExpenses();
      } else {
        addExpenseToOfflineQueue(expenseData);
        toast.success(
          "You are offline. Expense saved locally and will be synced later.",
        );
      }

      await localDataStore.addExpense(expenseData);
      toast.success("Your expense has been added.");

      setExpenseForm({
        amount: "",
        title: "",
        category: [],
        for: [],
        date: new Date(),
        cardId: expenseForm.cardId, // Keep same card selected
      });
    } catch (error: unknown) {
      console.error("Error creating expense:", error);
      toast.error("Could not add your expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !incomeForm.amount ||
      !incomeForm.source ||
      incomeForm.category.length === 0
    ) {
      toast.error("Please enter the amount, source, and category.");
      return;
    }

    if (!incomeForm.cardId) {
      toast.error("Please select the card where you received this income.");
      return;
    }

    const amount = parseFloat(incomeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid income amount.");
      return;
    }

    setIsSubmitting(true);

    const incomeData = {
      amount,
      source: incomeForm.source,
      category: incomeForm.category[0],
      date: new Date(incomeForm.date).getTime(),
      cardId: incomeForm.cardId as any,
      notes: incomeForm.notes,
    };

    try {
      if (localStorageManager) {
        await localStorageManager.saveIncome(incomeData);
      }

      if (isOnline) {
        await createIncomeMutation({ token: token!, ...incomeData });
        toast.success("Your income has been added.");
        refetchIncome();
      } else {
        addIncomeToOfflineQueue(incomeData);
        toast.success(
          "You are offline. Income saved locally and will be synced later.",
        );
      }

      await localDataStore.addIncome(incomeData);
      toast.success("Your income has been added.");

      setIncomeForm({
        amount: "",
        source: "",
        category: [],
        date: new Date(),
        cardId: incomeForm.cardId,
        notes: "",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "There was an error adding your income. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autocomplete lists handlers
  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!categories) return [];
    return categories
      .filter((cat) => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map((cat) => cat.name);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    try {
      if (localStorageManager) {
        await localStorageManager.saveCategory({ name, type: "expense" });
      }
      await createCategoryMutation({ token, name });
      await localDataStore.addCategory(name);
    } catch (error) {
      toast.error("Failed to create category.");
      console.error(error);
    }
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter((f) => f.value.toLowerCase().includes(query.toLowerCase()))
      .map((f) => f.value);
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    try {
      if (localStorageManager) {
        await localStorageManager.saveForValue({ value });
      }
      await createForValueMutation({ token, value });
      await localDataStore.addForValue(value);
    } catch (error) {
      toast.error("Failed to add 'for' value.");
      console.error(error);
    }
  };

  const fetchIncomeCategorySuggestions = async (
    query: string,
  ): Promise<string[]> => {
    if (!allIncomeCategories) return [];
    return allIncomeCategories.filter((cat: string) =>
      cat.toLowerCase().includes(query.toLowerCase()),
    );
  };

  // Card mappings for quick name lookup
  const cardMap =
    cards?.reduce(
      (acc, card) => {
        acc[card._id] = card.name;
        return acc;
      },
      {} as Record<string, string>,
    ) || {};

  // Expense list — filtered against pending deletions (undo window)
  const combinedExpenses = (expenses || [])
    .filter((expense) => !pendingExpenseDeletions.includes(expense._id))
    .sort((a, b) => b.date - a.date);

  // Income list — filtered against pending deletions (undo window)
  const combinedIncome = (incomes || [])
    .filter((income) => !pendingIncomeDeletions.includes(income._id))
    .sort((a, b) => b.date - a.date);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="max-w-lg mx-auto py-4 pt-[68px] pb-24">
        {/* TABS COMPONENT */}
        <Tabs
          tabs={[
            { id: "expense", label: "Expense" },
            { id: "income", label: "Income" },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* ACTIVE TAB CONTENT */}
        {activeTab === "expense" ? (
          <div className="space-y-6 px-4">
            {/* EXPENSE FORM */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <h2 className="text-2xl font-medium text-gray-900">
                  Add New Expense
                </h2>
                <p className="mt-1 text-sm font-light leading-5 text-gray-900">
                  Fill in the details below to track your expense
                </p>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <CurrencyInput
                    value={expenseForm.amount}
                    onChangeValue={(val) =>
                      setExpenseForm({ ...expenseForm, amount: val })
                    }
                    required
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    value={expenseForm.title}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, title: e.target.value })
                    }
                    placeholder="Add a title"
                    icon={Type}
                    required
                  />
                </div>

                <div>
                  <InputContainer
                    leftIcon={CreditCard}
                    rightAdornment={
                      <svg
                        className="size-5 text-gray-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  >
                    <select
                      value={expenseForm.cardId}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          cardId: e.target.value,
                        })
                      }
                      className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none font-normal"
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
                  value={expenseForm.category}
                  onChange={(newCategories) =>
                    setExpenseForm({ ...expenseForm, category: newCategories })
                  }
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
                  value={expenseForm.for}
                  onChange={(newFor) =>
                    setExpenseForm({ ...expenseForm, for: newFor })
                  }
                  fetchSuggestions={fetchForSuggestions}
                  onCreateNew={handleCreateForValue}
                  formatNewItem={capitalizeWords}
                  placeholder="Who is this for"
                  rightText="Optional"
                />

                <CustomDatePicker
                  label="Date *"
                  value={format(expenseForm.date, "yyyy-MM-dd")}
                  onChange={(dateString) => {
                    const [year, month, day] = dateString
                      .split("-")
                      .map(Number);
                    const newDate = new Date(expenseForm.date);
                    newDate.setFullYear(year, month - 1, day);
                    setExpenseForm({ ...expenseForm, date: newDate });
                  }}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
                  disabled={
                    isSubmitting ||
                    expenseForm.category.length === 0 ||
                    !expenseForm.cardId
                  }
                  loading={isSubmitting}
                >
                  Add Expense
                </Button>
              </form>
            </motion.div>

            {/* Offline indicator */}
            {isUsingOfflineExpenseData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium"
              >
                Viewing Offline Backup Data
              </motion.div>
            )}

            {/* HISTORY SECTION */}
            <div className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
              <DateFilterHeader
                monthName={expenseMonthName}
                year={expenseYear}
                onPreviousMonth={goToPreviousExpenseMonth}
                onNextMonth={goToNextExpenseMonth}
                subtitle="Expense History"
                variant="card"
              />

              {combinedExpenses.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {combinedExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense._id}
                      expense={expense as any}
                      cardName={cardMap[expense.cardId!] || "Unknown Card"}
                      onDelete={(expenseId: Id<"expenses">) => {
                        setPendingExpenseDeletions((prev) => [
                          ...prev,
                          expenseId,
                        ]);

                        const toastId = toast.success("Expense deleted", {
                          action: {
                            label: "Undo",
                            onClick: () => {
                              setPendingExpenseDeletions((prev) =>
                                prev.filter((id) => id !== expenseId),
                              );
                              toast.dismiss(toastId);
                            },
                          },
                          onAutoClose: async () => {
                            try {
                              await localDataStore.deleteExpense(expenseId);
                            } catch (error) {
                              console.error("Failed to delete expense:", error);
                              toast.error("Failed to delete expense.");
                              setPendingExpenseDeletions((prev) =>
                                prev.filter((id) => id !== expenseId),
                              );
                            }
                          },
                          duration: 5000,
                        });
                      }}
                      onEdit={(id) => setEditingExpenseId(id as Id<"expenses">)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">
                    You have no expenses recorded for this month.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 px-4">
            {/* INCOME FORM */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <h2 className="text-2xl font-medium text-gray-900">
                  Add New Income
                </h2>
                <p className="mt-1 text-sm font-light leading-5 text-gray-900">
                  Fill in the details below to track your income
                </p>
              </div>

              <form onSubmit={handleIncomeSubmit} className="space-y-4">
                <div>
                  <CurrencyInput
                    value={incomeForm.amount}
                    onChangeValue={(val) =>
                      setIncomeForm({ ...incomeForm, amount: val })
                    }
                    required
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    value={incomeForm.source}
                    onChange={(e) =>
                      setIncomeForm({ ...incomeForm, source: e.target.value })
                    }
                    placeholder="Add a title"
                    icon={CaseSensitive}
                    required
                  />
                </div>

                <div>
                  <InputContainer
                    leftIcon={CreditCard}
                    rightAdornment={
                      <svg
                        className="size-5 text-gray-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  >
                    <select
                      value={incomeForm.cardId}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, cardId: e.target.value })
                      }
                      className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none font-normal"
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
                  value={incomeForm.category}
                  onChange={(newCategory) =>
                    setIncomeForm({ ...incomeForm, category: newCategory })
                  }
                  fetchSuggestions={fetchIncomeCategorySuggestions}
                  onCreateNew={async () => {}}
                  formatNewItem={capitalizeWords}
                  placeholder="Choose category"
                />

                <CustomDatePicker
                  label="Date *"
                  value={format(incomeForm.date, "yyyy-MM-dd")}
                  onChange={(dateString) => {
                    const [year, month, day] = dateString
                      .split("-")
                      .map(Number);
                    const newDate = new Date(incomeForm.date);
                    newDate.setFullYear(year, month - 1, day);
                    setIncomeForm({ ...incomeForm, date: newDate });
                  }}
                />

                <div className="rounded-[10px] border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]">
                  <div className="px-4 py-3">
                    <textarea
                      value={incomeForm.notes}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, notes: e.target.value })
                      }
                      className={`w-full bg-transparent outline-none placeholder:text-gray-500 resize-none min-h-[88px] text-sm ${incomeForm.notes ? "font-medium text-gray-900" : "font-normal text-gray-900"}`}
                      placeholder="Notes (Optional)"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
                  disabled={
                    isSubmitting ||
                    incomeForm.category.length === 0 ||
                    !incomeForm.cardId
                  }
                  loading={isSubmitting}
                >
                  Add Income
                </Button>
              </form>
            </motion.div>

            {/* Offline indicator */}
            {isUsingOfflineIncomeData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium"
              >
                Viewing Offline Backup Data
              </motion.div>
            )}

            {/* HISTORY SECTION */}
            <div className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
              <DateFilterHeader
                monthName={incomeMonthName}
                year={incomeYear}
                onPreviousMonth={goToPreviousIncomeMonth}
                onNextMonth={goToNextIncomeMonth}
                subtitle="Income History"
                variant="card"
              />

              {combinedIncome.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {combinedIncome.map((incomeRecord) => (
                    <IncomeCard
                      key={incomeRecord._id}
                      income={incomeRecord as any}
                      cardName={cardMap[incomeRecord.cardId] || "Unknown Card"}
                      onDelete={(incomeId: Id<"income">) => {
                        setPendingIncomeDeletions((prev) => [
                          ...prev,
                          incomeId,
                        ]);

                        const toastId = toast.success("Income deleted", {
                          action: {
                            label: "Undo",
                            onClick: () => {
                              setPendingIncomeDeletions((prev) =>
                                prev.filter((id) => id !== incomeId),
                              );
                              toast.dismiss(toastId);
                            },
                          },
                          onAutoClose: async () => {
                            try {
                              await localDataStore.deleteIncome(incomeId);
                            } catch (error) {
                              console.error("Failed to delete income:", error);
                              toast.error("Failed to delete income.");
                              setPendingIncomeDeletions((prev) =>
                                prev.filter((id) => id !== incomeId),
                              );
                            }
                          },
                          duration: 5000,
                        });
                      }}
                      onEdit={(id) => setEditingIncomeId(id as Id<"income">)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp
                    className="mx-auto text-gray-400 mb-4"
                    size={48}
                  />
                  <p className="text-gray-500">
                    You have no income recorded for this month.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <EditExpenseSheet
        expenseId={editingExpenseId}
        open={editingExpenseId !== null}
        onClose={() => setEditingExpenseId(null)}
        onSuccess={refetchExpenses}
      />
      <EditIncomeSheet
        incomeId={editingIncomeId}
        open={editingIncomeId !== null}
        onClose={() => setEditingIncomeId(null)}
        onSuccess={refetchIncome}
      />
    </div>
  );
}

export default function AddTransactionPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <AddTransactionContent />
      </Suspense>
    </ProtectedRoute>
  );
}
