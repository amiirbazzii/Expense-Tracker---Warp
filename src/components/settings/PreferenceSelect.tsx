"use client";

import { LucideIcon } from "lucide-react";
import InputContainer from "@/components/InputContainer";

interface Option {
  value: string;
  label: string;
}

interface PreferenceSelectProps {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => Promise<void>;
  options: Option[];
}

export function PreferenceSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: PreferenceSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} *
      </label>
      <InputContainer
        leftIcon={Icon}
        rightAdornment={
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
        }
      >
        <select
          value={value}
          onChange={async (e) => {
            await onChange(e.target.value);
          }}
          className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </InputContainer>
    </div>
  );
}
