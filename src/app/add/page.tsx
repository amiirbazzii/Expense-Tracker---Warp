"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
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
  TrendingUp,
  Type,
  CaseSensitive,
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
import { useLocalData } from "@/hooks/useLocalData";
import { localDataStore } from "@/lib/store";
import { useExpenseForm } from "@/hooks/useExpenseForm";
import { useIncomeForm } from "@/hooks/useIncomeForm";
import { useDeleteWithUndo } from "@/hooks/useDeleteWithUndo";

const capitalizeWords = (str: string) =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function CardSelect({
  value,
  cards,
  onChange,
}: {
  value: string;
  cards: { _id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <InputContainer
      leftIcon={CreditCard}
      rightAdornment={
        <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none font-normal"
        required
      >
        <option value="">Select card</option>
        {cards.map((card) => (
          <option key={card._id} value={card._id}>
            {card.name}
          </option>
        ))}
      </select>
    </InputContainer>
  );
}

function OfflineBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium"
    >
      Viewing Offline Backup Data
    </motion.div>
  );
}

function AddTransactionContent() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"expense" | "income">(
    tabParam === "income" ? "income" : "expense",
  );

  useEffect(() => {
    if (tabParam === "income" || tabParam === "expense") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = useCallback(
    (tab: "expense" | "income") => {
      setActiveTab(tab);
      router.replace(`/add?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  const {
    form: expenseForm,
    setField: setExpenseField,
    handleDateChange: handleExpenseDateChange,
    handleSubmit: handleExpenseSubmit,
    isSubmitting: expenseSubmitting,
  } = useExpenseForm();

  const {
    form: incomeForm,
    setField: setIncomeField,
    handleDateChange: handleIncomeDateChange,
    handleSubmit: handleIncomeSubmit,
    isSubmitting: incomeSubmitting,
  } = useIncomeForm();

  const { deleteWithUndo: deleteExpense, filterPending: filterExpenses } =
    useDeleteWithUndo((id) => localDataStore.deleteExpense(id), "Expense");

  const { deleteWithUndo: deleteIncome, filterPending: filterIncomes } =
    useDeleteWithUndo((id) => localDataStore.deleteIncome(id), "Income");

  const { categories, forValues, cards: localCards, income: offlineIncome } =
    useLocalData();

  const cards = (localCards || []).map((c) => ({
    _id: c.cardId,
    name: c.cardName,
    isArchived: c.isArchived,
    userId: "",
    createdAt: 0,
    _creationTime: 0,
  }));

  const incomeCategories = Array.isArray(offlineIncome)
    ? [...new Set(offlineIncome.map((i) => i.category).filter(Boolean))]
    : [];

  const {
    data: expenses,
    monthName: expenseMonth,
    year: expenseYear,
    goToPreviousMonth: prevExpMonth,
    goToNextMonth: nextExpMonth,
    refetch: refetchExpenses,
    isUsingOfflineData: offlineExpense,
  } = useTimeFramedData("expense", token);

  const {
    data: incomes,
    monthName: incomeMonth,
    year: incomeYear,
    goToPreviousMonth: prevIncMonth,
    goToNextMonth: nextIncMonth,
    refetch: refetchIncome,
    isUsingOfflineData: offlineIncomeData,
  } = useTimeFramedData("income", token);

  const activeCards = cards.filter((c) => !c.isArchived);

  useEffect(() => {
    if (activeCards.length > 0) {
      if (!expenseForm.cardId) setExpenseField("cardId", activeCards[0]._id);
      if (!incomeForm.cardId) setIncomeField("cardId", activeCards[0]._id);
    }
  }, [activeCards.length]);

  const catSuggestions = useCallback(
    async (q: string) =>
      categories
        ?.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
        .map((c) => c.name) ?? [],
    [categories],
  );

  const createCategory = useCallback(async (name: string) => {
    try {
      await localDataStore.addCategory(name);
    } catch (e) {
      toast.error("Failed to create category.");
      console.error(e);
    }
  }, []);

  const forSuggestions = useCallback(
    async (q: string) =>
      forValues
        ?.filter((f) => f.value.toLowerCase().includes(q.toLowerCase()))
        .map((f) => f.value) ?? [],
    [forValues],
  );

  const createForValue = useCallback(async (value: string) => {
    try {
      await localDataStore.addForValue(value);
    } catch (e) {
      toast.error("Failed to add 'for' value.");
      console.error(e);
    }
  }, []);

  const incomeCatSuggestions = useCallback(
    async (q: string) =>
      incomeCategories.filter((c) => c.toLowerCase().includes(q.toLowerCase())),
    [incomeCategories],
  );

  const cardMap: Record<string, string> = {};
  cards.forEach((c) => {
    cardMap[c._id] = c.name;
  });

  const shownExpenses = [...filterExpenses(expenses || [])].sort(
    (a: any, b: any) => b.date - a.date,
  );
  const shownIncomes = [...filterIncomes(incomes || [])].sort(
    (a: any, b: any) => b.date - a.date,
  );

  const [editExpenseId, setEditExpenseId] = useState<Id<"expenses"> | null>(
    null,
  );
  const [editIncomeId, setEditIncomeId] = useState<Id<"income"> | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="max-w-lg mx-auto py-4 pt-[68px] pb-24">
        <Tabs
          tabs={[
            { id: "expense", label: "Expense" },
            { id: "income", label: "Income" },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
        {activeTab === "expense" ? (
          <ExpenseTab
            form={expenseForm}
            setField={setExpenseField}
            onDateChange={handleExpenseDateChange}
            onSubmit={handleExpenseSubmit}
            isSubmitting={expenseSubmitting}
            activeCards={activeCards}
            catSuggestions={catSuggestions}
            createCategory={createCategory}
            forSuggestions={forSuggestions}
            createForValue={createForValue}
            offline={offlineExpense}
            expenses={shownExpenses}
            cardMap={cardMap}
            month={expenseMonth}
            year={expenseYear}
            onPrevMonth={prevExpMonth}
            onNextMonth={nextExpMonth}
            onDelete={deleteExpense}
            onEdit={(id) => setEditExpenseId(id as Id<"expenses">)}
          />
        ) : (
          <IncomeTab
            form={incomeForm}
            setField={setIncomeField}
            onDateChange={handleIncomeDateChange}
            onSubmit={handleIncomeSubmit}
            isSubmitting={incomeSubmitting}
            activeCards={activeCards}
            catSuggestions={incomeCatSuggestions}
            offline={offlineIncomeData}
            incomes={shownIncomes}
            cardMap={cardMap}
            month={incomeMonth}
            year={incomeYear}
            onPrevMonth={prevIncMonth}
            onNextMonth={nextIncMonth}
            onDelete={deleteIncome}
            onEdit={(id) => setEditIncomeId(id as Id<"income">)}
          />
        )}
      </div>
      <BottomNav />
      <EditExpenseSheet
        expenseId={editExpenseId}
        open={editExpenseId !== null}
        onClose={() => setEditExpenseId(null)}
        onSuccess={refetchExpenses}
      />
      <EditIncomeSheet
        incomeId={editIncomeId}
        open={editIncomeId !== null}
        onClose={() => setEditIncomeId(null)}
        onSuccess={refetchIncome}
      />
    </div>
  );
}

function ExpenseTab({
  form,
  setField,
  onDateChange,
  onSubmit,
  isSubmitting,
  activeCards,
  catSuggestions,
  createCategory,
  forSuggestions,
  createForValue,
  offline,
  expenses,
  cardMap,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onDelete,
  onEdit,
}: {
  form: { amount: string; title: string; category: string[]; for: string[]; date: Date; cardId: string };
  setField: (k: string, v: any) => void;
  onDateChange: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  activeCards: { _id: string; name: string }[];
  catSuggestions: (q: string) => Promise<string[]>;
  createCategory: (n: string) => Promise<void>;
  forSuggestions: (q: string) => Promise<string[]>;
  createForValue: (v: string) => Promise<void>;
  offline: boolean;
  expenses: any[];
  cardMap: Record<string, string>;
  month: string;
  year: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="space-y-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4">
          <h2 className="text-2xl font-medium text-gray-900">Add New Expense</h2>
          <p className="mt-1 text-sm font-light leading-5 text-gray-900">
            Fill in the details below to track your expense
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <CurrencyInput
            value={form.amount}
            onChangeValue={(v) => setField("amount", v)}
            required
          />
          <Input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Add a title"
            icon={Type}
            required
          />
          <CardSelect
            value={form.cardId}
            cards={activeCards}
            onChange={(v) => setField("cardId", v)}
          />
          <SmartSelectInput
            icon={Tag}
            name="category"
            label="Categories *"
            multiple
            value={form.category}
            onChange={(v) => setField("category", v)}
            fetchSuggestions={catSuggestions}
            onCreateNew={createCategory}
            formatNewItem={capitalizeWords}
            placeholder="Choose category"
          />
          <SmartSelectInput
            icon={User}
            name="for"
            label="For (Optional)"
            multiple={false}
            value={form.for}
            onChange={(v) => setField("for", v)}
            fetchSuggestions={forSuggestions}
            onCreateNew={createForValue}
            formatNewItem={capitalizeWords}
            placeholder="Who is this for"
            rightText="Optional"
          />
          <CustomDatePicker
            label="Date *"
            value={format(form.date, "yyyy-MM-dd")}
            onChange={onDateChange}
          />
          <Button
            type="submit"
            className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
            disabled={isSubmitting || form.category.length === 0 || !form.cardId}
            loading={isSubmitting}
          >
            Add Expense
          </Button>
        </form>
      </motion.div>
      {offline && <OfflineBanner />}
      <div className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
        <DateFilterHeader
          monthName={month}
          year={year}
          onPreviousMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          subtitle="Expense History"
          variant="card"
        />
        {expenses.length > 0 ? (
          <div className="space-y-2 mt-4">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                cardName={cardMap[expense.cardId!] || "Unknown Card"}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">You have no expenses recorded for this month.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IncomeTab({
  form,
  setField,
  onDateChange,
  onSubmit,
  isSubmitting,
  activeCards,
  catSuggestions,
  offline,
  incomes,
  cardMap,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onDelete,
  onEdit,
}: {
  form: { amount: string; source: string; category: string[]; date: Date; cardId: string; notes: string };
  setField: (k: string, v: any) => void;
  onDateChange: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  activeCards: { _id: string; name: string }[];
  catSuggestions: (q: string) => Promise<string[]>;
  offline: boolean;
  incomes: any[];
  cardMap: Record<string, string>;
  month: string;
  year: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="space-y-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4">
          <h2 className="text-2xl font-medium text-gray-900">Add New Income</h2>
          <p className="mt-1 text-sm font-light leading-5 text-gray-900">
            Fill in the details below to track your income
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <CurrencyInput
            value={form.amount}
            onChangeValue={(v) => setField("amount", v)}
            required
          />
          <Input
            type="text"
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
            placeholder="Add a title"
            icon={CaseSensitive}
            required
          />
          <CardSelect
            value={form.cardId}
            cards={activeCards}
            onChange={(v) => setField("cardId", v)}
          />
          <SmartSelectInput
            icon={Tag}
            name="category"
            label="Category *"
            multiple={false}
            value={form.category}
            onChange={(v) => setField("category", v)}
            fetchSuggestions={catSuggestions}
            onCreateNew={async () => {}}
            formatNewItem={capitalizeWords}
            placeholder="Choose category"
          />
          <CustomDatePicker
            label="Date *"
            value={format(form.date, "yyyy-MM-dd")}
            onChange={onDateChange}
          />
          <div className="rounded-[10px] border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]">
            <div className="px-4 py-3">
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className={`w-full bg-transparent outline-none placeholder:text-gray-500 resize-none min-h-[88px] text-sm ${form.notes ? "font-medium text-gray-900" : "font-normal text-gray-900"}`}
                placeholder="Notes (Optional)"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
            disabled={isSubmitting || form.category.length === 0 || !form.cardId}
            loading={isSubmitting}
          >
            Add Income
          </Button>
        </form>
      </motion.div>
      {offline && <OfflineBanner />}
      <div className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
        <DateFilterHeader
          monthName={month}
          year={year}
          onPreviousMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          subtitle="Income History"
          variant="card"
        />
        {incomes.length > 0 ? (
          <div className="space-y-2 mt-4">
            {incomes.map((income) => (
              <IncomeCard
                key={income._id}
                income={income}
                cardName={cardMap[income.cardId] || "Unknown Card"}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">You have no income recorded for this month.</p>
          </div>
        )}
      </div>
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
