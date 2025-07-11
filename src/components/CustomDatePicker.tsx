"use client";

import React, { useRef, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { useSettings } from "@/contexts/SettingsContext";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Calendar } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // Expects date in "YYYY-MM-DD" format
  onChange: (date: string) => void;
  label: string;
}

export function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  // Prepare the value to pass to the picker as a *string* in the calendar it will display.
  const DISPLAY_FORMAT = isJalali ? "YYYY/MM/DD" : "YYYY-MM-DD";

  // Keep a stable DateObject reference to avoid identity churn between renders.
  const dateRef = useRef<DateObject | null>(null);

  // Sync ref with incoming `value` prop.
  useEffect(() => {
    if (!value) {
      dateRef.current = null;
      return;
    }
    const base = new DateObject({ date: value, calendar: gregorian });
    const target = isJalali ? base.convert(persian) : base;

    // Only replace the ref if the date actually changed (to keep identity stable).
    if (!dateRef.current || dateRef.current.format("YYYY-MM-DD") !== target.format("YYYY-MM-DD")) {
      dateRef.current = target;
    }
  }, [value, isJalali]);

  const handleChange = (dateObj: DateObject | null) => {
    if (!dateObj) return;
    // Convert the selected date to Gregorian calendar first
    const gregorianDate = dateObj.convert(gregorian);
    // `toDate()` gives a native JS `Date` object which we then format with `date-fns`
    // This guarantees the output uses standard (English) digits regardless of locale.
    const jsDate = gregorianDate.toDate();
    onChange(formatDate(jsDate, "yyyy-MM-dd"));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Calendar className="inline w-4 h-4 mr-1" />
        {label}
      </label>
      <DatePicker
        value={dateRef.current}
        onChange={handleChange}
        format={DISPLAY_FORMAT}
        containerClassName="w-full"
        calendar={isJalali ? persian : undefined}
        locale={isJalali ? persian_fa : undefined}
        inputClass="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
      />
    </div>
  );
}
