import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDate } from "@/lib/formatters";

interface HeaderSectionProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function HeaderSection({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth 
}: HeaderSectionProps) {
  const { settings } = useSettings();

  return (
    <div className="flex items-center justify-between mb-4">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onPreviousMonth}
        className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </motion.button>
      
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">
          {settings ? formatDate(currentDate, settings.calendar, 'MMMM yyyy') : new Date(currentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h1>
        <p className="text-sm text-gray-600">Monthly Summary</p>
      </div>
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onNextMonth}
        className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </motion.button>
    </div>
  );
}
