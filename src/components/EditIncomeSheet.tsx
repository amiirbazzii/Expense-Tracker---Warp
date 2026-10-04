"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/BottomSheet";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { format } from "date-fns";
import { Id } from "../../convex/_generated/dataModel";
import { Type, CreditCard, Tag } from "lucide-react";
import { useLocalData } from "@/hooks/useLocalData";
import { localDataStore } from "@/lib/store";

interface EditIncomeSheetProps {
  incomeId: Id<"income"> | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditIncomeSheet({
  incomeId,
  open,
  onClose,
  onSuccess,
}: EditIncomeSheetProps) {
  // All reference data from the reactive local store
  const { income, cards: localCards } = useLocalData();

  // Find the income record being edited from local data
  const incomeRecord = incomeId
    ? income.find((i) => i._id === incomeId)
    : undefined;

  // Map local card docs to the shape the <select> expects
  const cards = localCards.map((card) => ({
    _id: card.cardId,
    name: card.cardName,
  }));

  // Derive unique income categories from local income data
  const incomeCategories = Array.from(
    new Set(income.map((i) => i.category).filter(Boolean)),
  );

  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    category: [] as string[],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (incomeRecord && open) {
      setFormData({
        amount: incomeRecord.amount.toString(),
        source: incomeRecord.source,
        category: [incomeRecord.category],
        date: format(new Date(incomeRecord.date), "yyyy-MM-dd"),
        cardId: incomeRecord.cardId,
        notes: incomeRecord.notes || "",
      });
    }
  }, [incomeRecord, open]);

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!incomeCategories) return [];
    return incomeCategories.filter((cat) =>
      cat.toLowerCase().includes(query.toLowerCase()),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeId) return;

    if (
      !formData.amount ||
      !formData.source ||
      formData.category.length === 0
    ) {
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
      await localDataStore.updateIncome(incomeId, {
        amount,
        source: formData.source,
        category: formData.category[0],
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId as Id<"cards">,
        notes: formData.notes,
      });

      toast.success("Your income has been successfully updated.");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("There was an error updating your income. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Income">
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
          <InputContainer leftIcon={Type}>
            <input
              type="text"
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              className={`w-full bg-transparent outline-none placeholder:text-ink-tertiary ${formData.source
                ? "font-medium text-ink-primary"
                : "font-normal text-ink-primary"
                }`}
              placeholder="Salary, Freelance, etc."
              required
            />
          </InputContainer>
        </div>

        <div>
          <InputContainer
            leftIcon={CreditCard}
            rightAdornment={
              <svg
                className="size-5 text-ink-secondary"
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
              className="w-full bg-transparent outline-none text-ink-primary placeholder:text-ink-tertiary py-1 px-0 appearance-none font-normal"
              required
            >
              <option value="" disabled className="bg-surface-raised text-ink-primary">
                Select a card
              </option>
              {cards?.map((card) => (
                <option key={card._id} value={card._id} className="bg-surface-raised text-ink-primary">
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
          onChange={(newCategory) =>
            setFormData({ ...formData, category: newCategory })
          }
          fetchSuggestions={fetchCategorySuggestions}
          placeholder="Select or add a category"
        />

        <CustomDatePicker
          label=""
          value={formData.date}
          onChange={(date) => setFormData({ ...formData, date })}
        />

        <div className="rounded-[10px] border border-border-default bg-surface-field focus-within:border-accent focus-within:shadow-focus-field">
          <div className="px-4 py-3">
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className={`w-full bg-transparent outline-none placeholder:text-ink-tertiary resize-none min-h-[88px] text-sm ${formData.notes
                ? "font-medium text-ink-primary"
                : "font-normal text-ink-primary"
                }`}
              placeholder="Add any notes here..."
            />
          </div>
        </div>

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
            Update Income
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
