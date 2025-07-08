"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, Calendar, PieChart } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardPage() {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const expenses = useQuery(
    api.expenses.getExpensesByDateRange,
    token
      ? {
          token,
          startDate: startOfMonth(currentDate).getTime(),
          endDate: endOfMonth(currentDate).getTime(),
        }
      : "skip"
  );

  const monthlyData = useMemo(() => {
    if (!expenses) return null;

    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalCount = expenses.length;

    // Category breakdown
    const categoryTotals = expenses.reduce((acc, expense) => {
      expense.category.forEach((cat) => {
        acc[cat] = (acc[cat] || 0) + expense.amount;
      });
      return acc;
    }, {} as Record<string, number>);

    // Daily breakdown
    const dailyTotals = expenses.reduce((acc, expense) => {
      const day = format(new Date(expense.date), "MMM d");
      acc[day] = (acc[day] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAmount,
      totalCount,
      categoryTotals,
      dailyTotals,
    };
  }, [expenses]);

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const categoryChartData = useMemo(() => {
    if (!monthlyData?.categoryTotals) return null;

    const categories = Object.keys(monthlyData.categoryTotals);
    const amounts = Object.values(monthlyData.categoryTotals);

    return {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: [
            "#3B82F6",
            "#EF4444",
            "#10B981",
            "#F59E0B",
            "#8B5CF6",
            "#F97316",
            "#06B6D4",
            "#84CC16",
            "#EC4899",
            "#6B7280",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [monthlyData?.categoryTotals]);

  const dailyChartData = useMemo(() => {
    if (!monthlyData?.dailyTotals) return null;

    const days = Object.keys(monthlyData.dailyTotals);
    const amounts = Object.values(monthlyData.dailyTotals);

    return {
      labels: days,
      datasets: [
        {
          label: "Daily Expenses",
          data: amounts,
          backgroundColor: "#3B82F6",
          borderColor: "#1D4ED8",
          borderWidth: 1,
        },
      ],
    };
  }, [monthlyData?.dailyTotals]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <OfflineBanner />
        
        <div className="max-w-md mx-auto p-4 pt-8 pb-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={previousMonth}
                className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronLeft size={20} />
              </motion.button>
              
              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900">
                  {format(currentDate, "MMMM yyyy")}
                </h1>
                <p className="text-sm text-gray-600">Monthly Summary</p>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronRight size={20} />
              </motion.button>
            </div>

            {/* Summary Cards */}
            {monthlyData ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="text-blue-600" size={20} />
                    <span className="text-sm text-blue-800">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    ${monthlyData.totalAmount.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="text-green-600" size={20} />
                    <span className="text-sm text-green-800">Expenses</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {monthlyData.totalCount}
                  </div>
                </div>
              </div>
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

          {/* Charts */}
          {monthlyData && Object.keys(monthlyData.categoryTotals).length > 0 && (
            <>
              {/* Category Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm p-6 mb-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <PieChart className="text-gray-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>
                </div>
                
                {categoryChartData && (
                  <div className="h-64">
                    <Pie data={categoryChartData} options={pieChartOptions} />
                  </div>
                )}
              </motion.div>

              {/* Daily Breakdown */}
              {Object.keys(monthlyData.dailyTotals).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg shadow-sm p-6 mb-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="text-gray-600" size={20} />
                    <h2 className="text-lg font-semibold text-gray-900">Daily Spending</h2>
                  </div>
                  
                  {dailyChartData && (
                    <div className="h-64">
                      <Bar data={dailyChartData} options={chartOptions} />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Category List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
                <div className="space-y-3">
                  {Object.entries(monthlyData.categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-gray-700">{category}</span>
                        <span className="font-semibold text-gray-900">
                          ${amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            </>
          )}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
