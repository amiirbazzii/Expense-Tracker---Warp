"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppHeader from "@/components/AppHeader";
import { useParams } from "next/navigation";
import { useLocalData } from "@/hooks/useLocalData";
import { useExpenseForm } from "@/hooks/useExpenseForm";
import { ExpenseFormFields } from "@/components/expenses/ExpenseFormFields";
import { localDataStore } from "@/lib/store";
import { useMemo, useCallback } from "react";

export default function EditExpensePage() {
  const { id } = useParams();
  const { expenses, categories, forValues, cards: localCards } = useLocalData();

  const expense = useMemo(
    () => expenses?.find((e) => e._id === id),
    [expenses, id],
  );

  const activeCards = useMemo(
    () =>
      (localCards || [])
        .filter((c) => !c.isArchived)
        .map((card) => ({ _id: card.cardId, name: card.cardName })),
    [localCards],
  );

  const catSuggestions = useCallback(
    async (query: string) => {
      if (!categories) return [];
      return categories
        .filter((cat) => cat.name.toLowerCase().includes(query.toLowerCase()))
        .map((cat) => cat.name);
    },
    [categories],
  );

  const forSuggestions = useCallback(
    async (query: string) => {
      if (!forValues) return [];
      return forValues
        .filter((f) => f.value.toLowerCase().includes(query.toLowerCase()))
        .map((f) => f.value);
    },
    [forValues],
  );

  const createCategory = useCallback(async (name: string) => {
    await localDataStore.addCategory(name);
    toast.success(`The category "${name}" has been created.`);
  }, []);

  const createForValue = useCallback(async (value: string) => {
    await localDataStore.addForValue(value);
    toast.success(`The value "${value}" has been created for the 'For' field.`);
  }, []);

  const { form, setField, handleDateChange, handleSubmit, isSubmitting } =
    useExpenseForm({
      existingExpense: expense,
      expenseId: id as string,
    });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader title="Edit Expense" />

        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Expense Details
              </h2>
              <p className="text-sm text-gray-600">
                Update the information below
              </p>
            </div>
            <ExpenseFormFields
              form={form}
              setField={setField}
              onDateChange={handleDateChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              activeCards={activeCards}
              catSuggestions={catSuggestions}
              createCategory={createCategory}
              forSuggestions={forSuggestions}
              createForValue={createForValue}
              submitLabel="Update Expense"
              requireCard={false}
            />
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
