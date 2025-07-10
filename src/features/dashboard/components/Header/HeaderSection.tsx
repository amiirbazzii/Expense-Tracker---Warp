import { format } from "date-fns";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
          {format(currentDate, "MMMM yyyy")}
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
