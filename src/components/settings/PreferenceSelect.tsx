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
  onChange: (value: string) => Promise<void> | void;
  options: Option[];
}

export function PreferenceSelect({
  label,
  value,
  onChange,
  options,
}: PreferenceSelectProps) {
  return (
    <div className="w-full flex items-center justify-between px-4 py-3">
      {/* Label */}
      <p className="font-medium text-[16px] text-ink-primary whitespace-nowrap">
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
              aria-pressed={isSelected}
              onClick={async () => {
                if (!isSelected) {
                  await onChange(opt.value);
                }
              }}
              className={`text-[12px] font-medium py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isSelected
                  ? "bg-accent text-accent-foreground px-3 border border-accent"
                  : "bg-surface-raised border border-border-subtle text-ink-secondary px-2 hover:bg-surface-hover"
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

