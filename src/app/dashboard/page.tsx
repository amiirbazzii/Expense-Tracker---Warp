"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { WifiOff, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Import components
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { CardFilter } from "../../features/dashboard/components/CardFilter";
import { Chip } from "@/components/Chip";

import { CategoryBreakdownChart, DailySpendingChart } from "../../features/dashboard/components/Charts";
import { CategoryList } from "../../features/dashboard/components/CategoryList";
import { ModeTabs } from "@/features/dashboard/components/ModeTabs";

import { TotalBalanceCard } from "@/features/dashboard/components/TotalBalanceCard/TotalBalanceCard";
import DashboardFilterSheet, { DashboardFilters } from "@/features/dashboard/components/DashboardFilterSheet";


// Import hooks
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useExpenseActions } from "@/features/dashboard/hooks/useExpenseActions";
import { useSettings } from "@/contexts/SettingsContext";
import { useOfflineFirstData } from "@/hooks/useOfflineFirstData";

// Import types


export default function DashboardPage() {
    const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const cardsQuery = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");
  const { cards: offlineCards } = useOfflineFirstData();
  const cards = cardsQuery !== undefined ? cardsQuery : offlineCards;
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);


  // Data is provided by a single hook instance below (with optional date override)

  const {
    selectedExpense,
    handleEdit,
  } = useExpenseActions();

  

  // Handle edit navigation
  const handleEditNavigation = (expense: any) => {
    const expenseId = handleEdit(expense);
    if (expenseId) {
      router.push(`/expenses/edit/${expenseId}`);
    }
  };

  // Tab mode: 'expenses' | 'income'
  const [mode, setMode] = useState<'expenses' | 'income'>('expenses');

  // Filters state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    datePreset: 'thisMonth',
    categories: [],
    forValue: undefined,
  });

  // Suggestions from offline/online combined source
  const { categories: categoriesAll, forValues: forValuesAll } = useOfflineFirstData();
  const expenseCategoryNames: string[] = useMemo(() => (categoriesAll || []).map((c: any) => c.name).filter(Boolean), [categoriesAll]);
  const forValueNames: string[] = useMemo(() => (forValuesAll || []).map((f: any) => f.value).filter(Boolean), [forValuesAll]);

  // Compute date range override based on preset
  const dateRangeOverride = useMemo(() => {
    if (filters.datePreset === 'custom' && filters.start && filters.end) {
      return { start: filters.start, end: filters.end };
    }
    if (filters.datePreset === 'last7Days') {
      const end = new Date(); end.setHours(23,59,59,999);
      const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      return { start: start.getTime(), end: end.getTime() };
    }
    if (filters.datePreset === 'lastMonth') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    // thisMonth -> let hook compute based on currentDate
    return undefined;
  }, [filters]);

  // Re-run data hook when date override changes
  const {
    expenses: effExpenses,
    income: effIncome,
    monthlyData: effMonthlyData,
    isLoading: effIsLoading,
    isUsingOfflineData: effIsUsingOfflineData,
    monthName: effMonthName,
    year: effYear,
    goToNextMonth,
    goToPreviousMonth,
    refetchExpenses,
  } = useDashboardData(token, selectedCardId, dateRangeOverride);

  // Derive income categories from the loaded income data (exclude transfers)
  const incomeCategoryNames: string[] = useMemo(() => {
    const names = new Set<string>();
    (effIncome || []).forEach((inc: any) => {
      const cat = Array.isArray(inc.category) ? inc.category[0] : inc.category;
      if (cat && cat !== 'Card Transfer') names.add(cat);
    });
    return Array.from(names);
  }, [effIncome]);

  // When data loading completes after a navigation, hide the overlay
  useEffect(() => {
    if (navigating && !effIsLoading) {
      setNavigating(false);
    }
  }, [effIsLoading, navigating]);

  const handleNextMonth = () => {
    if (effIsLoading) return; // guard
    setNavigating(true);
    goToNextMonth();
  };

  const handlePreviousMonth = () => {
    if (effIsLoading) return; // guard
    setNavigating(true);
    goToPreviousMonth();
  };

  // Derived per-mode category totals and daily totals
  const { categoryTotalsForMode, dailyTotalsForMode, totalForMode } = useMemo(() => {
    if (mode === 'income') {
      let list = (effIncome || []).filter((item: any) => item && item.category !== 'Card Transfer');
      // category filter applies to income as well
      if (filters.categories.length > 0) {
        list = list.filter((it: any) => filters.categories.includes(Array.isArray(it.category) ? it.category[0] : it.category));
      }
      const categoryTotals = list.reduce<Record<string, number>>((acc: Record<string, number>, item: any) => {
        const cat = item.category;
        acc[cat] = (acc[cat] || 0) + (item.amount || 0);
        return acc;
      }, {});
      const dailyTotals = list.reduce<Record<string, number>>((acc: Record<string, number>, item: any) => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        acc[key] = (acc[key] || 0) + (item.amount || 0);
        return acc;
      }, {});
      const total = list.reduce((s: number, i: any) => s + (i.amount || 0), 0);
      return { categoryTotalsForMode: categoryTotals, dailyTotalsForMode: dailyTotals, totalForMode: total };
    }
    // expenses mode
    let list = (effExpenses || []).filter((expense: any) => {
      const categories = Array.isArray(expense.category) ? expense.category : [expense.category];
      const notTransfer = !categories.includes('Card Transfer');
      const catOk = filters.categories.length > 0 ? categories.some((c: string) => filters.categories.includes(c)) : true;
      const forOk = filters.forValue ? (Array.isArray(expense.for) ? expense.for.includes(filters.forValue) : expense.for === filters.forValue) : true;
      return notTransfer && catOk && forOk;
    });

    const categoryTotals = list.reduce<Record<string, number>>((acc, expense) => {
      const categories = Array.isArray(expense.category) ? expense.category : [expense.category];
      categories.forEach((c: string) => {
        acc[c] = (acc[c] || 0) + (expense.amount || 0);
      });
      return acc;
    }, {});

    const dailyTotals = list.reduce<Record<string, number>>((acc: Record<string, number>, expense: any) => {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      acc[key] = (acc[key] || 0) + (expense.amount || 0);
      return acc;
    }, {});

    const total = list.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    return { categoryTotalsForMode: categoryTotals, dailyTotalsForMode: dailyTotals, totalForMode: total };
  }, [mode, effExpenses, effIncome, filters]);

  return (
    <>
      <div className="min-h-screen bg-white">
        <AppHeader />
        {(navigating || effIsLoading) && (
          <FullScreenLoader message="Loading month..." />
        )}
        
        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          {/* Offline Mode Indicator */}
          {effIsUsingOfflineData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center space-x-2 text-sm text-orange-700 font-medium">
                <WifiOff size={16} />
                <span>Viewing Offline Backup Data</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Showing data from your last backup. Connect to internet to see latest updates.
              </div>
            </motion.div>
          )}
          
          {/* Card Balances */}
           <TotalBalanceCard className="mb-6 rounded-2xl" />
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] mb-6 overflow-hidden"
          >
            {/* Header Section */}
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
            {cards && (
              <CardFilter
                cards={cards}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
                leadingSlot={<Chip onClick={() => setFiltersOpen(true)} leftIcon={<ChevronDown size={16} />}>Filter</Chip>}
              />
            )}
             <ModeTabs
                mode={mode}
                totalExpenses={mode === 'expenses' ? totalForMode : effMonthlyData?.totalExpenses || 0}
                totalIncome={mode === 'income' ? totalForMode : effMonthlyData?.totalIncome || 0}
                onChange={setMode}
              />

              {/* Analytics Content */}
          {Object.keys(categoryTotalsForMode).length > 0 ? (
            <>
              {/* Category Breakdown Chart */}
              <CategoryBreakdownChart categoryTotals={categoryTotalsForMode} />

              {/* Daily Spending Chart */}
              {Object.keys(dailyTotalsForMode).length > 0 && (
                <DailySpendingChart dailyTotals={dailyTotalsForMode} mode={mode} />
              )}

              {/* Category List */}
              <CategoryList categoryTotals={categoryTotalsForMode} expenses={effExpenses || []} income={effIncome || []} mode={mode} />
            </>
          ) : null}
          </motion.div>
        </div>

        <BottomNav />

        {/* Bottom sheet */}
        <DashboardFilterSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={mode === 'expenses' ? 'Filter expenses' : 'Filter income'}
          categoriesSuggestions={mode === 'income' ? incomeCategoryNames : expenseCategoryNames}
          forSuggestions={mode === 'expenses' ? forValueNames : []}
          showFor={mode === 'expenses'}
          initial={filters}
          onApply={(f) => setFilters(f)}
        />

      </div>
    </>
  );
}
