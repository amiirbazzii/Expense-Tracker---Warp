"use client";

import React, { useMemo, useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import InputContainer from "@/components/InputContainer";
import { Calendar, Filter as FilterIcon, ChevronDown } from "lucide-react";

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
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2"><Calendar size={16} /> Time period</h4>
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: "thisMonth", label: "This month" },
              { key: "lastMonth", label: "Last month" },
              { key: "last7Days", label: "Last 7d" },
              { key: "custom", label: "Custom" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDatePreset(key)}
                className={`text-sm rounded-full border px-3 py-2 ${datePreset === key ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300"}`}
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
          <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
          <InputContainer
            rightAdornment={(
              <ChevronDown className="text-gray-500" size={18} />
            )}
          >
            <select
              className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categoriesSuggestions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </InputContainer>
        </section>

        {/* For (expenses only) */}
        {showFor && (
          <section>
            <label className="block text-sm font-medium text-gray-900 mb-2">For</label>
            <InputContainer
              rightAdornment={(
                <ChevronDown className="text-gray-500" size={18} />
              )}
            >
              <select
                className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                value={forValue}
                onChange={(e) => setForValue(e.target.value)}
              >
                <option value="">All</option>
                {forSuggestions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </InputContainer>
          </section>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button onClick={handleReset}>Reset</Button>
          <Button onClick={handleApply}>
            <span className="inline-flex items-center gap-2">
              <FilterIcon size={18} />
              Apply filters
            </span>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default DashboardFilterSheet;
