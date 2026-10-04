"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
  isMainTitle = false,
  isLoading = false
}: DateFilterHeaderProps) {
  const containerClasses = "flex items-center justify-between mb-4";
  const titleClasses = isMainTitle
    ? "text-xl font-bold text-ink-primary text-center"
    : "text-lg font-semibold text-ink-primary text-center";

  const MainTitleComponent = isMainTitle ? 'h1' : 'h2';

  const formattedDate = `${monthName} ${year}`;

  return (
    <div className={containerClasses}>
      <Button
        buttonType="icon"
        size="medium"
        aria-label="Previous month"
        onClick={onPreviousMonth}
        loading={isLoading}
        disabled={isLoading}
        aria-busy={isLoading}
        icon={<ChevronLeft />}
      />

      <div className="text-center px-2">
        <MainTitleComponent className={titleClasses}>
          {formattedDate}
        </MainTitleComponent>
        {subtitle && <p className="text-sm text-ink-secondary text-center">{subtitle}</p>}
      </div>

      <Button
        buttonType="icon"
        size="medium"
        aria-label="Next month"
        onClick={onNextMonth}
        loading={isLoading}
        disabled={isLoading}
        aria-busy={isLoading}
        icon={<ChevronRight />}
      />
    </div>
  );
}
