"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DateFilterHeader } from "@/components/DateFilterHeader";
import { CardFilter } from "../../features/dashboard/components/CardFilter";
import { Chip } from "@/components/Chip";
import {
  CategoryBreakdownChart,
  DailySpendingChart,
} from "../../features/dashboard/components/Charts";
import { CategoryList } from "../../features/dashboard/components/CategoryList";
import { ModeTabs } from "@/features/dashboard/components/ModeTabs";
import { TotalBalanceCard } from "@/features/dashboard/components/TotalBalanceCard/TotalBalanceCard";
import DashboardFilterSheet from "@/features/dashboard/components/DashboardFilterSheet";

import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useExpenseActions } from "@/features/dashboard/hooks/useExpenseActions";
import { useLoanData } from "@/features/loans/hooks/useLoanData";
import { DashboardLoanSection } from "@/features/loans/components/DashboardLoanSection";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardDerivedData } from "@/hooks/useDashboardDerivedData";
import {
  getIncomeCategoryNames,
  getCategoryNames,
  getForValueNames,
} from "@/utils/dashboard";

import type { Expense } from "@/features/dashboard/types";

export default function DashboardPage() {
  const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const { cards } = useOfflineFirstData();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const {
    mode,
    setMode,
    filters,
    filtersOpen,
    setFiltersOpen,
    setFilters,
    dateRangeOverride,
    resetDateFilterIfNeeded,
  } = useDashboardFilters();

  const { handleEdit } = useExpenseActions();

  const handleEditNavigation = (expense: Expense) => {
    const expenseId = handleEdit(expense);
    if (expenseId) {
      router.push(`/expenses/edit/${expenseId}`);
    }
  };

  const {
    currentDate,
    expenses: effExpenses,
    income: effIncome,
    monthlyData: effMonthlyData,
    isLoading: effIsLoading,
    monthName: effMonthName,
    year: effYear,
    goToNextMonth,
    goToPreviousMonth,
  } = useDashboardData(token, selectedCardId, dateRangeOverride);

  const { loans: loanData, isLoading: loanLoading } = useLoanData();

  const loanGregorianDate = currentDate
    ? new Date(currentDate.valueOf())
    : new Date();
  const loanMonth = loanGregorianDate.getMonth() + 1;
  const numericYear = loanGregorianDate.getFullYear();

  const { categories: categoriesAll, forValues: forValuesAll } =
    useOfflineFirstData();
  const expenseCategoryNames = useMemo(
    () => getCategoryNames(categoriesAll),
    [categoriesAll],
  );
  const forValueNames = useMemo(
    () => getForValueNames(forValuesAll),
    [forValuesAll],
  );
  const incomeCategoryNames = useMemo(
    () => getIncomeCategoryNames(effIncome || []),
    [effIncome],
  );

  useEffect(() => {
    if (navigating && !effIsLoading) {
      setNavigating(false);
    }
  }, [effIsLoading, navigating, setNavigating]);

  const handleNextMonth = () => {
    if (effIsLoading) return;
    resetDateFilterIfNeeded();
    setNavigating(true);
    goToNextMonth();
  };

  const handlePreviousMonth = () => {
    if (effIsLoading) return;
    resetDateFilterIfNeeded();
    setNavigating(true);
    goToPreviousMonth();
  };

  const { categoryTotalsForMode, dailyTotalsForMode, totalForMode } =
    useDashboardDerivedData(mode, effExpenses || [], effIncome || [], filters);

  return (
    <>
      <div className="min-h-screen bg-white">
        <AppHeader />

        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          <TotalBalanceCard className="mb-6 rounded-2xl" />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] mb-6 overflow-hidden"
          >
            <div className="px-4 pt-4">
              <DateFilterHeader
                monthName={effMonthName}
                year={effYear}
                onNextMonth={handleNextMonth}
                onPreviousMonth={handlePreviousMonth}
                subtitle="Monthly Summary"
                isMainTitle={true}
                isLoading={effIsLoading || navigating}
              />
            </div>

            <DashboardLoanSection
              loans={loanData}
              isLoading={loanLoading}
              month={loanMonth}
              year={numericYear}
            />

            {cards && (
              <CardFilter
                cards={cards}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
                leadingSlot={
                  <Chip
                    onClick={() => setFiltersOpen(true)}
                    leftIcon={<ChevronDown size={16} />}
                  >
                    Filter
                  </Chip>
                }
              />
            )}

            <ModeTabs
              mode={mode}
              totalExpenses={
                mode === "expenses"
                  ? totalForMode
                  : effMonthlyData?.totalExpenses || 0
              }
              totalIncome={
                mode === "income"
                  ? totalForMode
                  : effMonthlyData?.totalIncome || 0
              }
              onChange={setMode}
            />

            {Object.keys(categoryTotalsForMode).length > 0 ? (
              <>
                <CategoryBreakdownChart
                  categoryTotals={categoryTotalsForMode}
                />
                {Object.keys(dailyTotalsForMode).length > 0 && (
                  <DailySpendingChart
                    dailyTotals={dailyTotalsForMode}
                    mode={mode}
                  />
                )}
                <CategoryList
                  categoryTotals={categoryTotalsForMode}
                  expenses={effExpenses || []}
                  income={effIncome || []}
                  mode={mode}
                />
              </>
            ) : null}
          </motion.div>
        </div>

        <BottomNav />

        <DashboardFilterSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={mode === "expenses" ? "Filter expenses" : "Filter income"}
          categoriesSuggestions={
            mode === "income" ? incomeCategoryNames : expenseCategoryNames
          }
          forSuggestions={mode === "expenses" ? forValueNames : []}
          showFor={mode === "expenses"}
          initial={filters}
          onApply={setFilters}
        />
      </div>
    </>
  );
}
