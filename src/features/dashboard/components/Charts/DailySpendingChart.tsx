"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TooltipItem } from 'chart.js';
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDate } from "@/lib/formatters";

// Dynamically import Bar to disable SSR for Chart.js components
const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false });

interface DailySpendingChartProps {
  dailyTotals: Record<string, number>;
  mode?: 'expenses' | 'income';
  title?: string;
  color?: string; // bar color override
}

export function DailySpendingChart({ dailyTotals, mode = 'expenses', title, color }: DailySpendingChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { settings } = useSettings();

  // Register Chart.js only on the client and mark component as mounted
  useEffect(() => {
    try {
      ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
    } catch (_) {
      // ignore if already registered during HMR/navigation
    }
    setIsMounted(true);
  }, []);

  if (!dailyTotals || Object.keys(dailyTotals).length === 0) {
    return null;
  }

  // Avoid rendering chart until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 h-64 animate-pulse" />
    );
  }

  const resolvedTitle = title ?? (mode === 'income' ? 'Daily Income' : 'Daily Spending');
  const barColor = color ?? (mode === 'income' ? '#22C55E' : '#3B82F6');
  const borderColor = mode === 'income' ? '#16A34A' : '#1D4ED8';

  const chartData = {
    labels: Object.keys(dailyTotals).map(date => settings ? formatDate(new Date(date), settings.calendar, 'MMM d') : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: mode === 'income' ? 'Daily Income' : 'Daily Expenses',
        data: Object.values(dailyTotals),
        backgroundColor: barColor,
        borderColor: borderColor,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            let label = context.dataset.label || '';
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
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
        ticks: {
          callback: (value: string | number) => settings ? formatCurrency(Number(value), settings.currency) : `$${value}`,
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
        <h2 className="text-lg font-semibold text-gray-900">{resolvedTitle}</h2>
      </div>
      
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  );
}
