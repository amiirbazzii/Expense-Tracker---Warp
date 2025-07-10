import { motion } from "framer-motion";
import { BarChart3, Receipt } from "lucide-react";

type TabType = 'analytics' | 'expenses';

interface AnalyticsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AnalyticsTabs({ activeTab, onTabChange }: AnalyticsTabsProps) {
  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onTabChange('analytics')}
        className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
          activeTab === 'analytics'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-selected={activeTab === 'analytics'}
        aria-label="View analytics"
      >
        <BarChart3 size={16} className="mr-2" />
        Analytics
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onTabChange('expenses')}
        className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
          activeTab === 'expenses'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-selected={activeTab === 'expenses'}
        aria-label="View expenses"
      >
        <Receipt size={16} className="mr-2" />
        Expenses
      </motion.button>
    </div>
  );
}
