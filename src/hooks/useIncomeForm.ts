import { useState, useCallback } from "react";
import { toast } from "sonner";
import { localDataStore } from "@/lib/store";
import { validateAmount } from "@/lib/validation";
import type { IncomeDoc } from "@/lib/store";

interface IncomeFormState {
  amount: string;
  source: string;
  category: string[];
  date: Date;
  cardId: string;
  notes: string;
}

const INITIAL_INCOME_FORM: IncomeFormState = {
  amount: "",
  source: "",
  category: [],
  date: new Date(),
  cardId: "",
  notes: "",
};

interface UseIncomeFormOptions {
  existingIncome?: IncomeDoc;
  incomeId?: string;
}

export function useIncomeForm(options?: UseIncomeFormOptions) {
  const [form, setForm] = useState<IncomeFormState>(() => {
    if (options?.existingIncome) {
      const e = options.existingIncome;
      return {
        amount: e.amount.toString(),
        source: e.source,
        category: [e.category],
        date: new Date(e.date),
        cardId: e.cardId,
        notes: e.notes || "",
      };
    }
    return INITIAL_INCOME_FORM;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDateChange = useCallback((dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    setForm((prev) => {
      const newDate = new Date(prev.date);
      newDate.setFullYear(year, month - 1, day);
      return { ...prev, date: newDate };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!form.amount || !form.source || form.category.length === 0) {
        toast.error("Please enter the amount, source, and category.");
        return;
      }

      if (!options?.incomeId && !form.cardId) {
        toast.error("Please select the card where you received this income.");
        return;
      }

      const { valid, amount, error } = validateAmount(form.amount);
      if (!valid) {
        toast.error(error);
        return;
      }

      setIsSubmitting(true);

      try {
        if (options?.incomeId) {
          await localDataStore.updateIncome(options.incomeId, {
            amount,
            source: form.source,
            category: form.category[0],
            date: new Date(form.date).getTime(),
            cardId: form.cardId,
            notes: form.notes,
          });
          toast.success("Your income has been updated.");
        } else {
          await localDataStore.addIncome({
            amount,
            source: form.source,
            category: form.category[0],
            date: new Date(form.date).getTime(),
            cardId: form.cardId,
            notes: form.notes,
          });
          toast.success("Your income has been added.");
          setForm((prev) => ({
            ...INITIAL_INCOME_FORM,
            cardId: prev.cardId,
          }));
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : options?.incomeId
              ? "There was an error updating your income. Please try again."
              : "There was an error adding your income. Please try again.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, options?.incomeId],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_INCOME_FORM);
  }, []);

  return {
    form,
    setField,
    handleDateChange,
    handleSubmit,
    resetForm,
    isSubmitting,
    setForm,
  };
}
