"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { Calendar, WifiOff } from 'lucide-react';
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Import components
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { SummaryCards } from "../../features/dashboard/components/SummaryCards";
import { CardFilter } from "../../features/dashboard/components/CardFilter";

import { CategoryBreakdownChart, DailySpendingChart } from "../../features/dashboard/components/Charts";
import { CategoryList } from "../../features/dashboard/components/CategoryList";

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
    isUsingOfflineData
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden"
          >
            {/* Header Section */}
            <div className="px-2 pt-2 pb-1">
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

            {/* Card Filter */}
            {cards && (
              <CardFilter
                cards={cards}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
              />
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-2 mb-6"
          >
            {/* Summary Cards */}
            {monthlyData ? (
              <SummaryCards
                totalIncome={monthlyData.totalIncome}
                totalExpenses={monthlyData.totalExpenses}
                isLoading={isLoading}
              />
            ) : expenses === undefined ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading summary...</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">You have no expenses for this month.</p>
              </div>
            )}
          </motion.div>

          
          {/* Analytics Content */}
          {monthlyData && Object.keys(monthlyData.categoryTotals).length > 0 ? (
            <>
              {/* Category Breakdown Chart */}
              <CategoryBreakdownChart categoryTotals={monthlyData.categoryTotals} />

              {/* Daily Spending Chart */}
              {Object.keys(monthlyData.dailyTotals).length > 0 && (
                <DailySpendingChart dailyTotals={monthlyData.dailyTotals} />
              )}

              {/* Category List */}
              <CategoryList categoryTotals={monthlyData.categoryTotals} expenses={expenses || []} />
            </>
          ) : null}
        </div>

        <BottomNav />

      </div>
    </>
  );
}
