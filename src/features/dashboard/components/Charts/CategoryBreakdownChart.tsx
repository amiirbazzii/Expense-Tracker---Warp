import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import { PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryBreakdownChartProps {
  categoryTotals: Record<string, number>;
}

export function CategoryBreakdownChart({ categoryTotals }: CategoryBreakdownChartProps) {
  const { settings } = useSettings();

  if (!categoryTotals || Object.keys(categoryTotals).length === 0) {
    return null;
  }

  // Filter out "Card Transfer" category
  const filteredCategoryTotals = Object.fromEntries(
    Object.entries(categoryTotals).filter(([category]) => category !== 'Card Transfer')
  );

  if (Object.keys(filteredCategoryTotals).length === 0) {
    return null;
  }

  const chartData = {
    labels: Object.keys(filteredCategoryTotals),
    datasets: [
      {
        data: Object.values(filteredCategoryTotals),
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          padding: 20,
          font: {
            size: 13,
          },
          usePointStyle: true,
          boxWidth: 12,
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context: TooltipItem<'pie'>) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.raw as number;
            if (context.raw !== null) {
              label += settings ? formatCurrency(value, settings.currency) : `$${value.toFixed(2)}`;
            }
            return label;
          }
        }
      },
    },
  };

  return (
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
      
      <div className="relative mx-auto" style={{ height: '280px', width: '100%' }}>
        <Pie
          data={chartData}
          options={options}
        />
      </div>
    </motion.div>
  );
}
