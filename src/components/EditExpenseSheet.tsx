"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BottomSheet } from "@/components/BottomSheet";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { format } from "date-fns";
import { Id } from "../../convex/_generated/dataModel";
import { PencilLine, CreditCard, Tag, User } from "lucide-react";
import { useLocalData } from "@/hooks/useLocalData";
import { localDataStore } from "@/lib/store";

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface EditExpenseSheetProps {
  expenseId: Id<"expenses"> | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditExpenseSheet({
  expenseId,
  open,
  onClose,
  onSuccess,
}: EditExpenseSheetProps) {
  // All reference data from the reactive local store
  const { expenses, categories, forValues, cards: localCards } = useLocalData();

  // Find the expense being edited from local data
  const expense = expenseId
    ? expenses.find((e) => e._id === expenseId)
    : undefined;

  // Map local card docs to the shape the <select> expects
  const cards = localCards.map((card) => ({
    _id: card.cardId,
    name: card.cardName,
  }));

  const [formData, setFormData] = useState({
    amount: "",
    title: "",
    category: [] as string[],
    for: [] as string[],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense && open) {
      setFormData({
        amount: expense.amount.toString(),
        title: expense.title,
        category: expense.category,
        for: Array.isArray(expense.for)
          ? expense.for
          : expense.for
            ? [expense.for]
            : [],
        date: format(new Date(expense.date), "yyyy-MM-dd"),
        cardId: expense.cardId || "",
      });
    }
  }, [expense, open]);

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!categories) return [];
    return categories
      .filter((cat) => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map((cat) => cat.name);
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter((f) => f.value.toLowerCase().includes(query.toLowerCase()))
      .map((f) => f.value);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    try {
      await localDataStore.addCategory(name);
      toast.success(`The category "${name}" has been created.`);
    } catch (error) {
      toast.error("There was an error creating the category.");
      console.error(error);
    }
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    try {
      await localDataStore.addForValue(value);
      toast.success(`The value "${value}" has been created.`);
    } catch (error) {
      toast.error("There was an error creating the value.");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseId) return;

    if (!formData.amount || !formData.title || formData.category.length === 0) {
      toast.error("Please enter the amount, title, and category.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await localDataStore.updateExpense(expenseId, {
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for,
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId || undefined,
      });

      toast.success("The expense has been successfully updated.");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("There was an error updating the expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <CurrencyInput
            value={formData.amount}
            onChangeValue={(val) => setFormData({ ...formData, amount: val })}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <InputContainer leftIcon={PencilLine}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full bg-transparent outline-none placeholder:text-gray-500 ${
                formData.title
                  ? "font-medium text-gray-900"
                  : "font-normal text-gray-900"
              }`}
              placeholder="Lunch, Gas, etc."
              required
            />
          </InputContainer>
        </div>

        <SmartSelectInput
          icon={Tag}
          name="category"
          label="Categories *"
          multiple
          value={formData.category}
          onChange={(newCategories) =>
            setFormData({ ...formData, category: newCategories })
          }
          fetchSuggestions={fetchCategorySuggestions}
          onCreateNew={handleCreateCategory}
          formatNewItem={capitalizeWords}
          placeholder="Select or add categories"
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
          placeholder="Select or add a person"
        />

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
              value={formData.cardId}
              onChange={(e) =>
                setFormData({ ...formData, cardId: e.target.value })
              }
              className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
              required
            >
              <option value="" disabled>
                Select a card
              </option>
              {cards?.map((card) => (
                <option key={card._id} value={card._id}>
                  {card.name}
                </option>
              ))}
            </select>
          </InputContainer>
        </div>

        <CustomDatePicker
          label="Date"
          value={formData.date}
          onChange={(date) => setFormData({ ...formData, date })}
        />

        <div className="pt-2 pb-4">
          <Button
            type="submit"
            size="large"
            disabled={
              isSubmitting || formData.category.length === 0 || !formData.cardId
            }
            loading={isSubmitting}
            className="w-full"
          >
            Update Expense
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
