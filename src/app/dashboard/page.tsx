"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, Calendar, PieChart, BarChart3, Receipt, Edit, Trash2, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { useMutation } from "convex/react";
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
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

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
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'analytics' | 'expenses'>('analytics');
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteExpenseMutation = useMutation(api.expenses.deleteExpense);

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

  const handleExpenseClick = (expense: any) => {
    setSelectedExpense(expense);
    setShowActionModal(true);
  };

  const handleEdit = () => {
    setShowActionModal(false);
    router.push(`/expenses/edit/${selectedExpense._id}`);
  };

  const handleDeleteClick = () => {
    setShowActionModal(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedExpense || !token) return;
    
    setIsDeleting(true);
    try {
      await deleteExpenseMutation({
        token,
        expenseId: selectedExpense._id,
      });
      toast.success("Expense deleted successfully!");
      setShowDeleteConfirm(false);
      setSelectedExpense(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete expense";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedExpense(null);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedExpense(null);
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

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
                  activeTab === 'analytics'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 size={16} className="mr-2" />
                Analytics
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
                  activeTab === 'expenses'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Receipt size={16} className="mr-2" />
                Expenses
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

          {/* Tab Content */}
          {activeTab === 'analytics' ? (
            /* Analytics Tab */
            monthlyData && Object.keys(monthlyData.categoryTotals).length > 0 && (
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
            )
          ) : (
            /* Expenses Tab */
            <div className="space-y-4">
              {expenses && expenses.length > 0 ? (
                expenses
                  .sort((a, b) => b._creationTime - a._creationTime)
                  .map((expense, index) => (
                    <motion.div
                      key={expense._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleExpenseClick(expense)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {expense.title}{expense.for ? ` for ${expense.for}` : ''}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-gray-600">
                          {expense.category.join(', ')}
                        </div>
                        <div className="text-gray-500">
                          {format(new Date(expense.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                      </div>
                    </motion.div>
                  ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-8 text-center"
                >
                  <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">No expenses for this month</p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        <BottomNav />

        {/* Action Modal */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Expense Actions</h3>
                <button
                  onClick={closeActionModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEdit}
                  className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Expense
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteClick}
                  className="w-full flex items-center justify-center py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors min-h-[44px]"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Expense
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-sm"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Expense</h3>
                <p className="text-gray-600">Are you sure you want to delete this expense? This action cannot be undone.</p>
              </div>
              
              <div className="flex space-x-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelDelete}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors min-h-[44px]"
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
