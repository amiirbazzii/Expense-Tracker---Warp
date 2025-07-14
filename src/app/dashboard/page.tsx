"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { Calendar, Receipt } from "lucide-react";

// Import components
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";

import { CategoryBreakdownChart, DailySpendingChart } from "@/features/dashboard/components/Charts";
import { CategoryList } from "@/features/dashboard/components/CategoryList";

import { TotalBalanceCard } from "@/features/dashboard/components/TotalBalanceCard/TotalBalanceCard";


// Import hooks
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useExpenseActions } from "@/features/dashboard/hooks/useExpenseActions";

// Import types


export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();


  // Use custom hooks for data and actions
  const {
    currentDate,
    expenses,
    monthlyData,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    refetchExpenses,
  } = useDashboardData(token);

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
            className="bg-white rounded-lg shadow-sm p-2 mb-6"
          >
            {/* Header Section */}
            <DateFilterHeader 
              currentDate={currentDate} 
              onPreviousMonth={goToPreviousMonth} 
              onNextMonth={goToNextMonth}
              subtitle="Monthly Summary"
              isMainTitle={true}
            />



            {/* Summary Cards */}
            {monthlyData ? (
              <SummaryCards
                totalIncome={monthlyData.totalIncome}
                totalExpenses={monthlyData.totalExpenses}
                isLoading={isLoading}
              />
            ) : expenses === undefined ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">No expenses for this month</p>
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
