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
    if (!dateObj) {
      onChange("");
      return;
    }
    // Convert the selected date to Gregorian calendar first
    const gregorianDate = dateObj.convert(gregorian);
    // `toDate()` gives a native JS `Date` object which we then format with `date-fns`
    // This guarantees the output uses standard (English) digits regardless of locale.
    const jsDate = gregorianDate.toDate();
    onChange(formatDate(jsDate, "yyyy-MM-dd"));
  };

  return (
    <div className="w-full">
      <div className="flex items-center w-full rounded-[10px] transition-all duration-300 border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]">
        <div className="flex items-center w-full p-4">
          <Calendar className="size-4 mr-2 shrink-0 text-[#707070]" />
          <DatePicker
            value={dateRef.current}
            onChange={handleChange}
            format={DISPLAY_FORMAT}
            containerClassName="w-full"
            calendar={isJalali ? persian : undefined}
            locale={isJalali ? persian_fa : undefined}
            inputClass="w-full bg-transparent outline-none text-black placeholder:text-gray-500 border-0 focus:ring-0 min-h-[24px] p-0"
          />
        </div>
        <div className="flex items-center pr-3">
          <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
