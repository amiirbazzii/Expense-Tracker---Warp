"use client";

import { Suspense, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppHeader from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { useLocalData } from "@/hooks/useLocalData";
import { useIncomeForm } from "@/hooks/useIncomeForm";
import { IncomeFormFields } from "@/components/income/IncomeFormFields";

// The record id travels as ?id=… instead of a path segment — see the note in
// expenses/edit/page.tsx. Static route → precached → works offline.

function EditIncomeContent() {
  const id = useSearchParams().get("id") ?? undefined;
  const { income, categories, cards: localCards } = useLocalData();

  const incomeRecord = useMemo(
    () => income?.find((i) => i._id === id),
    [income, id],
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

  const { form, setField, handleDateChange, handleSubmit, isSubmitting } =
    useIncomeForm({
      existingIncome: incomeRecord,
      incomeId: id as string,
    });

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Edit Income" />

      <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-4"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Income Details
            </h2>
            <p className="text-sm text-gray-600">
              Make changes to your income record below.
            </p>
          </div>
          <IncomeFormFields
            form={form}
            setField={setField}
            onDateChange={handleDateChange}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            activeCards={activeCards}
            catSuggestions={catSuggestions}
            submitLabel="Update Income"
          />
        </motion.div>
      </div>
    </div>
  );
}

export default function EditIncomePage() {
  return (
    <ProtectedRoute>
      {/* useSearchParams requires a Suspense boundary to keep the route
          statically prerenderable. */}
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <EditIncomeContent />
      </Suspense>
    </ProtectedRoute>
  );
}
