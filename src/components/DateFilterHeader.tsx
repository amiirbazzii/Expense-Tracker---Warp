import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDate } from "@/lib/formatters";


interface DateFilterHeaderProps {
  monthName: string;
  year: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  subtitle?: string;
  variant?: 'card' | 'default';
  isMainTitle?: boolean;
}

export function DateFilterHeader({ 
  monthName, 
  year, 
  onPreviousMonth, 
  onNextMonth, 
  subtitle, 
  variant = 'default',
  isMainTitle = false 
}: DateFilterHeaderProps) {
  const { settings } = useSettings();

  const containerClasses = variant === 'card'
    ? "flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm"
    : "flex items-center justify-between mb-4";

  const titleClasses = isMainTitle
    ? "text-xl font-bold text-gray-900"
    : "text-lg font-semibold text-gray-800";
  
  const MainTitleComponent = isMainTitle ? 'h1' : 'h2';

  const formattedDate = settings 
    ? `${monthName} ${year}` 
    : `${monthName} ${year}`;

  return (
    <div className={containerClasses}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onPreviousMonth}
        className="p-2 rounded-full text-gray-400 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </motion.button>
      
      <div className="text-center">
        <MainTitleComponent className={titleClasses}>
          {formattedDate}
        </MainTitleComponent>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onNextMonth}
        className="p-2 rounded-full text-gray-400 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </motion.button>
    </div>
  );
}
