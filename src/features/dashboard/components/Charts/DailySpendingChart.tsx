import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DailySpendingChartProps {
  dailyTotals: Record<string, number>;
}

export function DailySpendingChart({ dailyTotals }: DailySpendingChartProps) {
  if (!dailyTotals || Object.keys(dailyTotals).length === 0) {
    return null;
  }

  const chartData = {
    labels: Object.keys(dailyTotals),
    datasets: [
      {
        label: "Daily Expenses",
        data: Object.values(dailyTotals),
        backgroundColor: "#3B82F6",
        borderColor: "#1D4ED8",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
        ticks: {
          callback: (value: string | number) => `$${value}`,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
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
      
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  );
}
