"use client";

import React, { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import InputContainer from "@/components/InputContainer";
import { Calendar, Filter as FilterIcon, ChevronDown, Tag, Users } from "lucide-react";

// One heading treatment for every section, so the sheet reads as a single list
// of filters rather than three differently-styled blocks.
const SECTION_LABEL =
  "flex items-center gap-2 text-sm font-medium text-gray-900 mb-3";

export type DatePreset = "thisMonth" | "lastMonth" | "last7Days" | "custom";

export interface DashboardFilters {
  datePreset: DatePreset;
  start?: number;
  end?: number;
  categories: string[];
  forValue?: string; // only used for expenses
}

interface DashboardFilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  categoriesSuggestions: string[];
  forSuggestions: string[];
  showFor?: boolean;
  initial: DashboardFilters;
  onApply: (filters: DashboardFilters) => void;
}

export function DashboardFilterSheet({ open, onClose, title = "Filters", categoriesSuggestions, forSuggestions, showFor = true, initial, onApply }: DashboardFilterSheetProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>(initial.datePreset);
  const [start, setStart] = useState<number | undefined>(initial.start);
  const [end, setEnd] = useState<number | undefined>(initial.end);
  const [category, setCategory] = useState<string>(initial.categories?.[0] || "");
  const [forValue, setForValue] = useState<string>(initial.forValue || "");

  useEffect(() => {
    if (!open) return;
    setDatePreset(initial.datePreset);
    setStart(initial.start);
    setEnd(initial.end);
    setCategory(initial.categories?.[0] || "");
    setForValue(initial.forValue || "");
  }, [open, initial]);

  const handleApply = () => {
    onApply({ datePreset, start, end, categories: category ? [category] : [], forValue: forValue || undefined });
    onClose();
  };

  const handleReset = () => {
    setDatePreset("thisMonth");
    setStart(undefined);
    setEnd(undefined);
    setCategory("");
    setForValue("");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-6">
        {/* Date Range */}
        <section>
          <h4 className={SECTION_LABEL}><Calendar size={16} /> Time period</h4>
          {/* Two columns: "This month" / "Last month" do not fit across four
              at this sheet's width and were wrapping mid-label. */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "thisMonth", label: "This month" },
              { key: "lastMonth", label: "Last month" },
              { key: "last7Days", label: "Last 7 days" },
              { key: "custom", label: "Custom" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={datePreset === key}
                onClick={() => setDatePreset(key)}
                className={`text-sm rounded-full border px-3 py-2 transition-colors ${datePreset === key ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <CustomDatePicker
                label="Start"
                value={start ? new Date(start).toISOString().slice(0,10) : ""}
                onChange={(val) => {
                  const [y, m, d] = val.split("-").map(Number);
                  const dt = new Date();
                  dt.setHours(0,0,0,0);
                  dt.setFullYear(y, m-1, d);
                  setStart(dt.getTime());
                }}
              />
              <CustomDatePicker
                label="End"
                value={end ? new Date(end).toISOString().slice(0,10) : ""}
                onChange={(val) => {
                  const [y, m, d] = val.split("-").map(Number);
                  const dt = new Date();
                  dt.setHours(23,59,59,999);
                  dt.setFullYear(y, m-1, d);
                  setEnd(dt.getTime());
                }}
              />
            </div>
          )}
        </section>

        {/* Category dropdown */}
        <section>
          <label className={SECTION_LABEL} htmlFor="filter-category">
            <Tag size={16} /> Category
          </label>
          <InputContainer
            rightAdornment={(
              <ChevronDown className="text-gray-500" size={18} />
            )}
          >
            <select
              id="filter-category"
              className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categoriesSuggestions.map((c, i) => (
                <option key={`${c}-${i}`} value={c}>{c}</option>
              ))}
            </select>
          </InputContainer>
        </section>

        {/* For (expenses only) */}
        {showFor && (
          <section>
            <label className={SECTION_LABEL} htmlFor="filter-for">
              <Users size={16} /> For
            </label>
            <InputContainer
              rightAdornment={(
                <ChevronDown className="text-gray-500" size={18} />
              )}
            >
              <select
                id="filter-for"
                className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                value={forValue}
                onChange={(e) => setForValue(e.target.value)}
              >
                <option value="">All</option>
                {forSuggestions.map((f, i) => (
                  <option key={`${f}-${i}`} value={f}>{f}</option>
                ))}
              </select>
            </InputContainer>
          </section>
        )}

        {/* Both actions used to be the same default (primary) variant, sitting
            at opposite edges at their intrinsic widths with a gap floating
            between them. Reset is the secondary action, so it reads as one:
            the row is now a single full-width unit with Apply given the
            greater weight. */}
        <div className="flex items-stretch gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            size="medium"
            className="flex-1"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            size="medium"
            className="flex-[2] gap-2"
            onClick={handleApply}
          >
            <FilterIcon size={18} />
            Apply filters
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default DashboardFilterSheet;
