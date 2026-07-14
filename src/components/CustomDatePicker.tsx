"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { GregorianDatePicker } from "./date-pickers/GregorianDatePicker";
import { PersianDatePicker } from "./date-pickers/PersianDatePicker";

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

export function CustomDatePicker(props: CustomDatePickerProps) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  return isJalali
    ? <PersianDatePicker {...props} />
    : <GregorianDatePicker {...props} />;
}
