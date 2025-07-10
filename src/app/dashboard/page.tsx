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
import { HeaderSection } from "@/features/dashboard/components/Header";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { AnalyticsTabs } from "@/features/dashboard/components/AnalyticsTabs";
import { CategoryBreakdownChart, DailySpendingChart } from "@/features/dashboard/components/Charts";
import { CategoryList } from "@/features/dashboard/components/CategoryList";
import { ExpenseList } from "@/features/dashboard/components/Expenses";


// Import hooks
import { useExpenseData } from "@/features/dashboard/hooks/useExpenseData";
import { useExpenseActions } from "@/features/dashboard/hooks/useExpenseActions";

// Import types
import { TabType } from "@/features/dashboard/types";

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  // Use custom hooks for data and actions
  const {
    currentDate,
    expenses,
    monthlyData,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    refetchExpenses,
  } = useExpenseData(token);

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            {/* Header Section */}
            <HeaderSection
              currentDate={currentDate}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
            />

            {/* Tabs */}
            <AnalyticsTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Summary Cards */}
            {monthlyData ? (
              <SummaryCards
                totalAmount={monthlyData.totalAmount}
                totalCount={monthlyData.totalCount}
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

          {/* Tab Content */}
          {activeTab === 'analytics' ? (
            // Analytics Tab
            monthlyData && Object.keys(monthlyData.categoryTotals).length > 0 ? (
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
            ) : null
          ) : (
            // Expenses Tab
            expenses && <ExpenseList expenses={expenses} onEdit={handleEditNavigation} onDeleteSuccess={refetchExpenses} />
          )}
        </div>

        <BottomNav />

      </div>
    </>
  );
}
