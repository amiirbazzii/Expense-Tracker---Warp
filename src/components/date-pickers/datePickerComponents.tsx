"use client";

import type { Calendar, Locale } from "react-date-object";
import { Calendar as CalendarGrid, DateObject } from "react-multi-date-picker";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import InputContainer from "../InputContainer";

type MapDaysResult = HTMLAttributes<HTMLSpanElement> & {
  disabled?: boolean;
  hidden?: boolean;
};

export const POPOVER_WIDTH = 300;

export const TAB_BASE =
  "flex-1 py-2.5 text-[13px] font-medium text-center transition-all duration-200 select-none";
export const TAB_ACTIVE = `${TAB_BASE} text-black border-b-2 border-black`;
export const TAB_INACTIVE = `${TAB_BASE} text-gray-400 hover:text-gray-600 border-b-2 border-transparent`;

export const NAV_BUTTON_CLASSES =
  "p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150";
export const NAV_ICON_CLASSES = "text-gray-600";

export const GRID_CLASSES =
  "grid grid-cols-3 gap-3 p-4 text-center animate-fade-in";

export const CELL_BASE =
  "py-2.5 px-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer";
export const CELL_DEFAULT = `${CELL_BASE} text-gray-900 hover:bg-gray-100`;
export const CELL_SELECTED = `${CELL_BASE} bg-black text-white shadow-sm`;

export const CONFIRM_BUTTON_CLASSES =
  "w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all duration-150";

export const DROPDOWN_ICON = (
  <svg
    className="size-5 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface DatePickerTriggerProps {
  label: string;
  displayValue: string;
  fontClassName: string;
  onOpen: () => void;
}

export function DatePickerTrigger({
  label,
  displayValue,
  fontClassName,
  onOpen,
}: DatePickerTriggerProps) {
  return (
    <div onClick={onOpen}>
      <InputContainer
        leftIcon={CalendarIcon}
        rightAdornment={DROPDOWN_ICON}
      >
        <input
          value={displayValue}
          readOnly
          placeholder={label}
          className={`w-full bg-transparent outline-none text-black placeholder:text-gray-500 border-0 focus:ring-0 min-h-[24px] p-0 cursor-pointer ${fontClassName}`}
        />
      </InputContainer>
    </div>
  );
}

interface ViewModeTabsProps {
  tabLabels: [string, string, string];
  fontClassName: string;
  activeViewMode: "day" | "month" | "year";
  onViewModeChange: (mode: "day" | "month" | "year") => void;
}

export function ViewModeTabs({
  tabLabels,
  fontClassName,
  activeViewMode,
  onViewModeChange,
}: ViewModeTabsProps) {
  const viewModeMap: Record<string, "day" | "month" | "year"> = {
    [tabLabels[0]]: "day",
    [tabLabels[1]]: "month",
    [tabLabels[2]]: "year",
  };

  return (
    <div className={`flex ${fontClassName}`}>
      {tabLabels.map((label) => {
        const mode = viewModeMap[label];
        const isActive = mode === activeViewMode;
        return (
          <button
            type="button"
            key={label}
            onClick={() => onViewModeChange(mode)}
            className={isActive ? TAB_ACTIVE : TAB_INACTIVE}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface NavigationHeaderProps {
  rangeText: string;
  fontClassName: string;
  onBack: () => void;
  onForward: () => void;
}

export function NavigationHeader({
  rangeText,
  fontClassName,
  onBack,
  onForward,
}: NavigationHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 select-none">
      <button
        type="button"
        onClick={onBack}
        className={NAV_BUTTON_CLASSES}
        aria-label="Previous"
      >
        <ChevronRight size={18} className={NAV_ICON_CLASSES} />
      </button>
      <span className={`text-sm font-semibold text-gray-900 ${fontClassName}`}>
        {rangeText}
      </span>
      <button
        type="button"
        onClick={onForward}
        className={NAV_BUTTON_CLASSES}
        aria-label="Next"
      >
        <ChevronLeft size={18} className={NAV_ICON_CLASSES} />
      </button>
    </div>
  );
}

interface DayViewProps {
  tempDate: DateObject | null;
  currentDate: DateObject;
  calendar: Calendar;
  locale?: Locale;
  onDateChange: (dateObject: DateObject | null) => void;
  onMonthYearChange: (date: DateObject) => void;
  mapDays: (props: {
    date: DateObject;
    today: DateObject;
    isSameDate: (date1: DateObject, date2: DateObject) => boolean;
  }) => MapDaysResult | void;
  calendarClassName: string;
}

export function DayView({
  tempDate,
  currentDate,
  calendar,
  locale,
  onDateChange,
  onMonthYearChange,
  mapDays,
  calendarClassName,
}: DayViewProps) {
  return (
    <div className="w-full px-3">
      <CalendarGrid
        value={tempDate}
        onChange={onDateChange}
        currentDate={currentDate}
        onMonthChange={onMonthYearChange}
        onYearChange={onMonthYearChange}
        calendar={calendar}
        locale={locale}
        mapDays={mapDays}
        buttons={false}
        showOtherDays
        className={calendarClassName}
      />
    </div>
  );
}

interface MonthGridProps {
  currentDate: DateObject;
  tempDate: DateObject | null;
  calendar: Calendar;
  locale?: Locale;
  monthFormat: string;
  fontClassName: string;
  onMonthSelect: (monthNumber: number) => void;
}

export function MonthGrid({
  currentDate,
  tempDate,
  calendar,
  locale,
  monthFormat,
  fontClassName,
  onMonthSelect,
}: MonthGridProps) {
  return (
    <div key={`month-${currentDate.year}`} className={`${GRID_CLASSES} ${fontClassName}`}>
      {Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1;
        const monthDate = new DateObject({
          calendar,
          locale,
          year: currentDate.year,
          month: monthNumber,
          day: 1,
        });
        const monthName = monthDate.format(monthFormat);
        const isSelected =
          tempDate != null &&
          tempDate.month?.number === monthNumber &&
          tempDate.year === currentDate.year;

        return (
          <button
            type="button"
            key={monthNumber}
            onClick={() => onMonthSelect(monthNumber)}
            className={isSelected ? CELL_SELECTED : CELL_DEFAULT}
          >
            {monthName}
          </button>
        );
      })}
    </div>
  );
}

interface YearGridProps {
  currentDate: DateObject;
  tempDate: DateObject | null;
  onYearSelect: (year: number) => void;
}

export function YearGrid({
  currentDate,
  tempDate,
  onYearSelect,
}: YearGridProps) {
  const decadeStart = Math.floor(currentDate.year / 12) * 12;

  return (
    <div key={`year-${decadeStart}`} className={GRID_CLASSES}>
      {Array.from({ length: 12 }, (_, index) => {
        const year = decadeStart + index;
        const isSelected = tempDate?.year === year;

        return (
          <button
            type="button"
            key={year}
            onClick={() => onYearSelect(year)}
            className={isSelected ? CELL_SELECTED : CELL_DEFAULT}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}

interface ConfirmFooterProps {
  label: string;
  fontClassName: string;
  onConfirm: () => void;
}

export function ConfirmFooter({
  label,
  fontClassName,
  onConfirm,
}: ConfirmFooterProps) {
  return (
    <div className={`p-3 border-t border-gray-100 ${fontClassName}`}>
      <button
        type="button"
        onClick={onConfirm}
        className={CONFIRM_BUTTON_CLASSES}
      >
        {label}
      </button>
    </div>
  );
}
