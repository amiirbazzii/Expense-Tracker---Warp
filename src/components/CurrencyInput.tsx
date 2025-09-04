import React, { useState, useEffect, useRef } from "react";
import { DollarSign } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import InputContainer from "./InputContainer";

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Raw numeric string without separators (e.g. "8580909" or "1234.56") */
  value: string;
  /** Called with the raw numeric string when the user types */
  onChangeValue: (value: string) => void;
  /** Optional currency symbol (e.g. "$") – defaults to settings context */
  currencySymbol?: string;
}

/**
 * A reusable currency amount input that:
 * 1. Shows the currency symbol on the right side, inside the input.
 * 2. Formats the user's input with thousands separators while typing, e.g. 8,580,909.
 *
 * It keeps the *raw* numeric string (without commas) in the parent state to avoid issues
 * with form submission, while the displayed value is nicely formatted.
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeValue,
  currencySymbol,
  className = "",
  ...rest
}) => {
  const { settings } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  // focus state is handled visually by InputContainer via :focus-within

  const symbol = currencySymbol ?? settings?.currency ?? "USD";

  // Utility to get symbol from currency code
  const getSymbol = (code: string): string => {
    const map: Record<string, string> = {
      USD: "Dollar",
      EUR: "Euro",
      GBP: "Pound",
      IRR: "Toman",
    };
    return map[code] ?? code;
  };

  // Format raw numeric string with commas
  const formatNumber = (numStr: string) => {
    if (!numStr) return "";

    // Preserve decimal part if any
    const [intPart, decPart] = numStr.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, ""); // remove existing commas

    // Allow only digits and optional decimal point
    const cleaned = raw.replace(/[^0-9.]/g, "");

    // If multiple decimals entered, keep first segment
    const parts = cleaned.split(".");
    const normalized = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleaned;

    onChangeValue(normalized);
  };

  // Keep caret at end on formatting changes
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.selectionStart = input.selectionEnd = input.value.length;
    }
  }, [value]);

  return (
    <div className={`w-full ${className}`.trim()}>
      <InputContainer
        leftIcon={DollarSign}
        rightAdornment={<span className="text-gray-400 whitespace-nowrap">{getSymbol(symbol)}</span>}
      >
        <input
          ref={inputRef}
          type="text"
          value={formatNumber(value)}
          onChange={handleChange}
          className="w-full bg-transparent outline-none text-black placeholder:text-gray-500"
          {...rest}
        />
      </InputContainer>
    </div>
  );
};
