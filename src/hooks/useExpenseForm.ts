import { useState, useCallback } from "react";
import { toast } from "sonner";
import { localDataStore } from "@/lib/store";
import { validateAmount } from "@/lib/validation";

interface ExpenseFormState {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: Date;
  cardId: string;
}

const INITIAL_EXPENSE_FORM: ExpenseFormState = {
  amount: "",
  title: "",
  category: [],
  for: [],
  date: new Date(),
  cardId: "",
};

export function useExpenseForm() {
  const [form, setForm] = useState<ExpenseFormState>(INITIAL_EXPENSE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback((key: string, value: any) => {
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

      if (!form.amount || !form.title || form.category.length === 0) {
        toast.error("Please enter the amount, title, and category.");
        return;
      }

      if (!form.cardId) {
        toast.error("Please select the card used for this expense.");
        return;
      }

      const { valid, amount, error } = validateAmount(form.amount);
      if (!valid) {
        toast.error(error);
        return;
      }

      const parsedDate = new Date(form.date);
      if (isNaN(parsedDate.getTime())) {
        toast.error("Please enter a valid date.");
        return;
      }

      setIsSubmitting(true);

      try {
        await localDataStore.addExpense({
          amount,
          title: form.title,
          category: form.category,
          for: form.for,
          date: parsedDate.getTime(),
          cardId: form.cardId,
        });
        toast.success("Your expense has been added.");
        setForm((prev) => ({
          ...INITIAL_EXPENSE_FORM,
          cardId: prev.cardId,
        }));
      } catch {
        toast.error("Could not add your expense. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [form],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_EXPENSE_FORM);
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
