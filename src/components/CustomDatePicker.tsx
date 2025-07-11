"use client";

import { useSettings } from "@/contexts/SettingsContext";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
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

  const handleChange = (date: DateObject | null) => {
    if (date) {
      onChange(date.format("YYYY-MM-DD"));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Calendar className="inline w-4 h-4 mr-1" />
        {label}
      </label>
      <DatePicker
        value={value}
        onChange={handleChange}
        format="YYYY-MM-DD"
        containerClassName="w-full"
        calendar={isJalali ? persian : undefined}
        locale={isJalali ? persian_fa : undefined}
        render={(
          value: string,
          openCalendar: () => void,
          handleValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void
        ) => (
          <input
            type="text"
            value={value}
            onClick={openCalendar}
            onChange={handleValueChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white focus:border-blue-500 min-h-[44px]"
          />
        )}
      />
    </div>
  );
}
