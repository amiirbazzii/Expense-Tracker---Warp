"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { Calendar } from 'lucide-react';
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Import components
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { SummaryCards } from "../../features/dashboard/components/SummaryCards";
import { CardFilter } from "../../features/dashboard/components/CardFilter";

import { CategoryBreakdownChart, DailySpendingChart } from "../../features/dashboard/components/Charts";
import { CategoryList } from "../../features/dashboard/components/CategoryList";

import { TotalBalanceCard } from "@/features/dashboard/components/TotalBalanceCard/TotalBalanceCard";


// Import hooks
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useExpenseActions } from "@/features/dashboard/hooks/useExpenseActions";
import { useSettings } from "@/contexts/SettingsContext";

// Import types


export default function DashboardPage() {
    const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const cards = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : "skip");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);


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
    refetchExpenses 
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

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <HeaderRow
          left={
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          {/* Card Balances */}
           <TotalBalanceCard className="mb-6" />
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
                onNextMonth={goToNextMonth} 
                onPreviousMonth={goToPreviousMonth} 
                subtitle="Monthly Summary"
                isMainTitle={true}
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
              <CategoryList categoryTotals={monthlyData.categoryTotals} />
            </>
          ) : null}
        </div>

        <BottomNav />

      </div>
    </>
  );
}
