import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { localDataStore } from "@/lib/store";
import { validateAmount } from "@/lib/validation";
import type { ExpenseDoc } from "@/lib/store";

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

interface UseExpenseFormOptions {
  existingExpense?: ExpenseDoc;
  expenseId?: string;
}

export function useExpenseForm(options?: UseExpenseFormOptions) {
  const [form, setForm] = useState<ExpenseFormState>(() => {
    if (options?.existingExpense) {
      const e = options.existingExpense;
      return {
        amount: e.amount.toString(),
        title: e.title,
        category: e.category,
        for: Array.isArray(e.for) ? e.for : (e.for ? [e.for] : []),
        date: new Date(e.date),
        cardId: e.cardId || "",
      };
    }
    return INITIAL_EXPENSE_FORM;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // On a cold load of the edit page the record is not in the local store yet
  // when the form state initializes, so the fields stayed empty (and a save
  // would have written today's date and blank fields over the real record).
  // Populate from the record the first time it arrives, but never over text
  // the user has already typed.
  const populatedFor = useRef<string | null>(null);
  const existingId = options?.existingExpense?._id;
  useEffect(() => {
    const e = options?.existingExpense;
    if (!e || populatedFor.current === e._id) return;
    populatedFor.current = e._id;
    setForm((prev) => {
      const pristine = !prev.amount && !prev.title;
      if (!pristine) return prev;
      return {
        amount: e.amount.toString(),
        title: e.title,
        category: e.category,
        for: Array.isArray(e.for) ? e.for : (e.for ? [e.for] : []),
        date: new Date(e.date),
        cardId: e.cardId || "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingId]);


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

      if (!form.amount || !form.title || form.category.length === 0) {
        toast.error("Please enter the amount, title, and category.");
        return;
      }

      if (!options?.expenseId && !form.cardId) {
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
        if (options?.expenseId) {
          await localDataStore.updateExpense(options.expenseId, {
            amount,
            title: form.title,
            category: form.category,
            for: form.for,
            date: parsedDate.getTime(),
            cardId: form.cardId || undefined,
          });
          toast.success("Your expense has been updated.");
        } else {
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
        }
      } catch {
        toast.error(
          options?.expenseId
            ? "Could not update your expense. Please try again."
            : "Could not add your expense. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, options?.expenseId],
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
