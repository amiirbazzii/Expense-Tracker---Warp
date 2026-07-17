"use client";

import { LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface PreferenceSelectProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => Promise<void>;
  options: Option[];
}

export function PreferenceSelect({
  label,
  value,
  onChange,
  options,
}: PreferenceSelectProps) {
  return (
    <div className="w-full flex items-center justify-between px-4 py-3 drop-shadow-[0px_3px_2px_rgba(0,0,0,0.03)]">
      {/* Label */}
      <p className="font-medium text-[16px] text-black whitespace-nowrap">
        {label}
      </p>

      {/* Selector Chips */}
      <div className="flex items-center gap-2">
        {options.map((opt) => {
          // Case insensitive match to cover both uppercase and lowercase values
          const isSelected = opt.value.toLowerCase() === value.toLowerCase();

          return (
            <button
              key={opt.value}
              type="button"
              onClick={async () => {
                if (!isSelected) {
                  await onChange(opt.value);
                }
              }}
              className={`text-[12px] font-medium py-1.5 rounded-full transition-all cursor-pointer ${
                isSelected
                  ? "bg-black text-white px-3 border border-black"
                  : "bg-white/50 border border-[#d9d9d9] text-[#707070] px-2 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

