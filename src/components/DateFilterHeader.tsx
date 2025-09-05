import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/Button";


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
    ? "flex items-center justify-between mb-4 "
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
      <Button
        buttonType="icon"
        size="medium"
        aria-label="Previous month"
        onClick={onPreviousMonth}
        icon={<ChevronLeft size={20} />}
      />

      <div className="text-center px-2">
        <MainTitleComponent className={titleClasses}>
          {formattedDate}
        </MainTitleComponent>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <Button
        buttonType="icon"
        size="medium"
        aria-label="Next month"
        onClick={onNextMonth}
        icon={<ChevronRight size={20} />}
      />
    </div>
  );
}
