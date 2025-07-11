// import { format } from "date-fns"; // Replaced by useUserSettings
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUserSettings } from "@/contexts/UserSettingsContext";

interface DateFilterHeaderProps {
  currentDate: Date; // This is a Date object
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  title: string;
}

export function DateFilterHeader({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth, 
  title 
}: DateFilterHeaderProps) {
  const { formatMonthYear } = useUserSettings();

  return (
    <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onPreviousMonth}
        className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </motion.button>
      
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {formatMonthYear(currentDate.getTime())}
        </h2>
        <p className="text-sm text-gray-500">{title}</p>
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
