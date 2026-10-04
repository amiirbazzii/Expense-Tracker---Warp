import { motion } from "framer-motion";
import { BarChart3, Receipt } from "lucide-react";

type TabType = 'analytics' | 'expenses';

interface AnalyticsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AnalyticsTabs({ activeTab, onTabChange }: AnalyticsTabsProps) {
  return (
    <div className="flex space-x-1 bg-surface-sunken p-1 rounded-lg mb-6 border border-border-subtle">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onTabChange('analytics')}
        className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'analytics'
            ? 'bg-surface-raised text-ink-primary shadow-sm font-semibold'
            : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
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
        className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
          activeTab === 'expenses'
            ? 'bg-surface-raised text-ink-primary shadow-sm font-semibold'
            : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
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
