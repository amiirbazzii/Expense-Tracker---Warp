"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { Calendar, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Import components
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { CardFilter } from "../../features/dashboard/components/CardFilter";

import { CategoryBreakdownChart, DailySpendingChart } from "../../features/dashboard/components/Charts";
import { CategoryList } from "../../features/dashboard/components/CategoryList";
import { ModeTabs } from "@/features/dashboard/components/ModeTabs";

import { TotalBalanceCard } from "@/features/dashboard/components/TotalBalanceCard/TotalBalanceCard";


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


  // Use custom hooks for data and actions
  const { 
    currentDate, 
    expenses, 
    monthlyData, 
    isLoading, 
    monthName, 
    year, 
    goToPreviousMonth, 
    goToNextMonth, 
    refetchExpenses,
    isUsingOfflineData,
    income,
  } = useDashboardData(token, selectedCardId);

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

  // When data loading completes after a navigation, hide the overlay
  useEffect(() => {
    if (navigating && !isLoading) {
      setNavigating(false);
    }
  }, [isLoading, navigating]);

  const handleNextMonth = () => {
    if (isLoading) return; // guard
    setNavigating(true);
    goToNextMonth();
  };

  const handlePreviousMonth = () => {
    if (isLoading) return; // guard
    setNavigating(true);
    goToPreviousMonth();
  };

  // Derived per-mode category totals and daily totals
  const { categoryTotalsForMode, dailyTotalsForMode } = useMemo(() => {
    if (mode === 'income') {
      const list = (income || []).filter((item) => item && item.category !== 'Card Transfer');
      const categoryTotals = list.reduce<Record<string, number>>((acc, item) => {
        const cat = item.category;
        acc[cat] = (acc[cat] || 0) + (item.amount || 0);
        return acc;
      }, {});
      const dailyTotals = list.reduce<Record<string, number>>((acc, item) => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        acc[key] = (acc[key] || 0) + (item.amount || 0);
        return acc;
      }, {});
      return { categoryTotalsForMode: categoryTotals, dailyTotalsForMode: dailyTotals };
    }
    // expenses mode
    const cat = monthlyData?.categoryTotals ?? {};
    const daily = monthlyData?.dailyTotals ?? {};
    return { categoryTotalsForMode: cat, dailyTotalsForMode: daily };
  }, [mode, income, monthlyData]);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        {(navigating || isLoading) && (
          <FullScreenLoader message="Loading month..." />
        )}
        
        <div className="max-w-md mx-auto p-4 pt-[92px] pb-20">
          {/* Offline Mode Indicator */}
          {isUsingOfflineData && (
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
            className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden"
          >
            {/* Header Section */}
            <div className="px-2 pt-2 pb-4">
              <ModeTabs
                mode={mode}
                totalExpenses={monthlyData?.totalExpenses || 0}
                totalIncome={monthlyData?.totalIncome || 0}
                onChange={setMode}
              />
              <DateFilterHeader 
                monthName={monthName} 
                year={year} 
                onNextMonth={handleNextMonth} 
                onPreviousMonth={handlePreviousMonth} 
                subtitle="Monthly Summary"
                isMainTitle={true}
                isLoading={isLoading || navigating}
              />
            </div>
            {cards && (
              <CardFilter
                cards={cards}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
              />
            )}
          </motion.div>
          
          {/* Summary section removed: totals are displayed in ModeTabs */}

          
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
              <CategoryList categoryTotals={categoryTotalsForMode} expenses={expenses || []} income={income || []} mode={mode} />
            </>
          ) : null}
        </div>

        <BottomNav />

      </div>
    </>
  );
}
