"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import InputContainer from "@/components/InputContainer";
import { Type, CreditCard, Tag, User } from "lucide-react";
import { Loan } from "../types";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import { useLocalData } from "@/hooks/useLocalData";
import { localDataStore } from "@/lib/store";
import { Id } from "../../../../convex/_generated/dataModel";
import { MutationQueueManager } from "@/lib/queue/MutationQueueManager";
import { LocalStorageManager } from "@/lib/storage/LocalStorageManager";

interface PayInstallmentSheetProps {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  onPaid: () => void;
}

const capitalizeWords = (str: string) =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function PayInstallmentSheet({
  open,
  onClose,
  loan,
  onPaid,
}: PayInstallmentSheetProps) {
  const { user, token } = useAuth();

  // All reference data from the reactive local store
  const {
    categories: localCats,
    forValues: localForVals,
    cards: localCards,
  } = useLocalData();

  // Cards, categories, forValues from Convex
  const cardsQuery = useQuery(
    api.cardsAndIncome.getMyCards,
    token ? { token } : "skip",
  );
  const categoriesQuery = useQuery(
    api.expenses.getCategories,
    token ? { token } : "skip",
  );
  const forValuesQuery = useQuery(
    api.expenses.getForValues,
    token ? { token } : "skip",
  );

  const {
    cards: offlineCards,
    categories: offlineCategories,
    forValues: offlineForValues,
  } = useOfflineFirstData();

  const cards =
    cardsQuery !== undefined
      ? cardsQuery
      : (offlineCards as any[])?.map((c: any) => ({
          _id: c.cardId,
          name: c.cardName,
          userId: "",
          createdAt: 0,
          _creationTime: 0,
        }));

  const categories =
    categoriesQuery !== undefined ? categoriesQuery : offlineCategories;
  const forValues =
    forValuesQuery !== undefined ? forValuesQuery : offlineForValues;

  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);

  const localStorageManager = new LocalStorageManager();

  // Form state
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [cardId, setCardId] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [paidFor, setPaidFor] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill when loan changes
  useEffect(() => {
    if (loan && open) {
      setAmount(String(loan.installmentAmount));
      setTitle(loan.name);
      setCategory(["Installment"]);
      // Pre-fill with today's date
      setDate(new Date());
      setPaidFor([]);
      // Auto-select first card
      if (cards && cards.length > 0 && !cardId) {
        setCardId(cards[0]._id);
      }
    }
  }, [loan, open, cards, cardId]);

  const fetchCategorySuggestions = async (query: string) => {
    if (!categories) return [];
    return (categories as any[])
      .filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase()))
      .map((c: any) => c.name);
  };

  const handleCreateCategory = async (name: string) => {
    try {
      await localDataStore.addCategory(name);
    } catch {
      toast.error("Failed to create category.");
    }
  };

  const fetchForSuggestions = async (query: string) => {
    if (!forValues) return [];
    return (forValues as any[])
      .filter((f: any) => f.value.toLowerCase().includes(query.toLowerCase()))
      .map((f: any) => f.value);
  };

  const handleCreateForValue = async (value: string) => {
    try {
      await localDataStore.addForValue(value);
    } catch {
      toast.error("Failed to add 'for' value.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!cardId) {
      toast.error("Please select a card.");
      return;
    }
    if (category.length === 0) {
      toast.error("Please select a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Write expense locally — NO enqueue (payInstallment handles server creation)
      const localExpense = await localStorageManager.saveExpense({
        amount: parsedAmount,
        title: title || loan.name,
        category,
        for: paidFor,
        date: date.getTime(),
        cardId,
      }, { skipEnqueue: true });

      // 2. Update loan locally
      await localStorageManager.updateEntity("loans", loan._id, {
        paidInstallments: loan.paidInstallments + 1,
      } as any);

      // 3. Enqueue payInstallment with localExpenseId for post-sync linking
      const queue = new MutationQueueManager();
      await queue.enqueue("loans:payInstallment", {
        token,
        loanId: loan._id,
        amount: parsedAmount,
        title: title || loan.name,
        category,
        for: paidFor,
        date: date.getTime(),
        cardId,
        localExpenseId: localExpense.id,
      });

      // 4. Refresh → 0ms UI update
      await localDataStore.refresh();

      toast.success("Installment paid successfully!");
      onPaid();
      onClose();
    } catch (err: any) {
      console.error("Failed to pay installment:", err);
      toast.error(err?.message || "Failed to pay installment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Pay Installment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <CurrencyInput value={amount} onChangeValue={setAmount} required />

        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name"
          icon={Type}
          required
        />

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
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
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

        <SmartSelectInput
          icon={Tag}
          name="category"
          label="Category *"
          multiple
          value={category}
          onChange={setCategory}
          fetchSuggestions={fetchCategorySuggestions}
          onCreateNew={handleCreateCategory}
          formatNewItem={capitalizeWords}
          placeholder="Choose category"
        />

        <SmartSelectInput
          icon={User}
          name="for"
          label="Paid For (Optional)"
          multiple={false}
          value={paidFor}
          onChange={setPaidFor}
          fetchSuggestions={fetchForSuggestions}
          onCreateNew={handleCreateForValue}
          formatNewItem={capitalizeWords}
          placeholder="Who is this for"
          rightText="Optional"
        />

        <CustomDatePicker
          label="Date *"
          value={format(date, "yyyy-MM-dd")}
          onChange={(dateString) => {
            const [year, month, day] = dateString.split("-").map(Number);
            const newDate = new Date(date);
            newDate.setFullYear(year, month - 1, day);
            setDate(newDate);
          }}
        />

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={isSubmitting || category.length === 0 || !cardId}
          loading={isSubmitting}
        >
          Pay Installment
        </Button>
      </form>
    </BottomSheet>
  );
}
