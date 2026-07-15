"use client";

import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { useDatePickerState } from "./useDatePickerState";
import type { DatePickerConfig } from "./useDatePickerState";
import {
  DatePickerTrigger,
  ViewModeTabs,
  NavigationHeader,
  DayView,
  MonthGrid,
  YearGrid,
  ConfirmFooter,
} from "./datePickerComponents";

const PERSIAN_CONFIG: DatePickerConfig = {
  calendar: persian,
  locale: persian_fa,
  fontClassName: "font-sans force-persian",
  tabLabels: ["\u0631\u0648\u0632", "\u0645\u0627\u0647", "\u0633\u0627\u0644"],
  confirmLabel: "\u062A\u0627\u06CC\u06CC\u062F",
  displayFormat: "YYYY/MM/DD",
  monthFormat: "MMMM",
  isRtl: true,
  popoverClassName: "bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden persian-datepicker-popover",
  calendarClassName: "rmdp-custom rmdp-rtl",
};

interface PersianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

export function PersianDatePicker({ value, onChange, label }: PersianDatePickerProps) {
  const state = useDatePickerState(value, onChange, PERSIAN_CONFIG);
  const { config } = state;

  return (
    <div ref={state.wrapperRef} className="relative w-full">
      <DatePickerTrigger
        label={label}
        displayValue={state.displayValue}
        fontClassName={config.fontClassName}
        onOpen={state.open}
      />

      {state.isOpen && (
        <div
          ref={state.popoverRef}
          style={{ ...state.popoverStyle, direction: "rtl" }}
          className={config.popoverClassName}
        >
          <ViewModeTabs
            tabLabels={config.tabLabels}
            fontClassName={config.fontClassName}
            activeViewMode={state.viewMode}
            onViewModeChange={state.setViewMode}
          />

          <NavigationHeader
            rangeText={state.rangeText}
            fontClassName={config.fontClassName}
            onBack={state.goBack}
            onForward={state.goForward}
          />

          <div className="h-[256px] grid">
            {state.viewMode === "day" && (
              <DayView
                tempDate={state.tempDate}
                currentDate={state.currentDate}
                calendar={config.calendar}
                locale={config.locale}
                onDateChange={state.handleCalendarChange}
                onMonthYearChange={state.handleMonthYearChange}
                mapDays={state.handleMapDays}
                calendarClassName={config.calendarClassName}
              />
            )}
            {state.viewMode === "month" && (
              <MonthGrid
                currentDate={state.currentDate}
                tempDate={state.tempDate}
                calendar={config.calendar}
                locale={config.locale}
                monthFormat={config.monthFormat}
                fontClassName={config.fontClassName}
                onMonthSelect={state.handleMonthSelect}
              />
            )}
            {state.viewMode === "year" && (
              <YearGrid
                currentDate={state.currentDate}
                tempDate={state.tempDate}
                onYearSelect={state.handleYearSelect}
              />
            )}
          </div>

          <ConfirmFooter
            label={config.confirmLabel}
            fontClassName={config.fontClassName}
            onConfirm={state.handleConfirm}
          />
        </div>
      )}
    </div>
  );
}
