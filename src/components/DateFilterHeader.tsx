"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/Button";


interface DateFilterHeaderProps {
  monthName: string;
  year: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  subtitle?: string;
  variant?: 'card' | 'default';
  isMainTitle?: boolean;
  isLoading?: boolean;
}

export function DateFilterHeader({
  monthName,
  year,
  onPreviousMonth,
  onNextMonth,
  subtitle,
  variant = 'default',
  isMainTitle = false,
  isLoading = false
}: DateFilterHeaderProps) {
  const { settings } = useSettings();
  const [loadingDirection, setLoadingDirection] = useState<'prev' | 'next' | null>(null);

  const containerClasses = variant === 'card'
    ? "flex items-center justify-between mb-4"
    : "flex items-center justify-between mb-4";

  const titleClasses = isMainTitle
    ? "text-xl font-bold text-gray-900"
    : "text-lg font-semibold text-gray-800";

  const MainTitleComponent = isMainTitle ? 'h1' : 'h2';

  const formattedDate = settings
    ? `${monthName} ${year}`
    : `${monthName} ${year}`;

  const handlePreviousClick = () => {
    if (isLoading) return; // Prevent multiple clicks
    setLoadingDirection('prev');
    onPreviousMonth();
  };

  const handleNextClick = () => {
    if (isLoading) return; // Prevent multiple clicks
    setLoadingDirection('next');
    onNextMonth();
  };

  // Reset loading direction when loading completes
  useEffect(() => {
    if (!isLoading && loadingDirection) {
      setLoadingDirection(null);
    }
  }, [isLoading, loadingDirection]);

  const isPrevLoading = loadingDirection === 'prev' && (isLoading || loadingDirection !== null);
  const isNextLoading = loadingDirection === 'next' && (isLoading || loadingDirection !== null);

  return (
    <div className={containerClasses}>
      <Button
        buttonType="icon"
        size="medium"
        aria-label="Previous month"
        onClick={handlePreviousClick}
        loading={isPrevLoading}
        disabled={isLoading || loadingDirection !== null}
        aria-busy={isPrevLoading}
        icon={<ChevronLeft size={20} />}
      />

      <div className="text-center px-2 min-w-[180px]">
        <MainTitleComponent className={titleClasses}>
          {formattedDate}
        </MainTitleComponent>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <Button
        buttonType="icon"
        size="medium"
        aria-label="Next month"
        onClick={handleNextClick}
        loading={isNextLoading}
        disabled={isLoading || loadingDirection !== null}
        aria-busy={isNextLoading}
        icon={<ChevronRight size={20} />}
      />
    </div>
  );
}
