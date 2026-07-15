"use client";

import gregorian from "react-date-object/calendars/gregorian";
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

const GREGORIAN_CONFIG: DatePickerConfig = {
  calendar: gregorian,
  fontClassName: "font-sans",
  tabLabels: ["Day", "Month", "Year"],
  confirmLabel: "Confirm",
  displayFormat: "YYYY-MM-DD",
  monthFormat: "MMM",
  isRtl: false,
  popoverClassName: "bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden",
  calendarClassName: "rmdp-custom",
};

interface GregorianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

export function GregorianDatePicker({ value, onChange, label }: GregorianDatePickerProps) {
  const state = useDatePickerState(value, onChange, GREGORIAN_CONFIG);
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
          style={state.popoverStyle}
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
