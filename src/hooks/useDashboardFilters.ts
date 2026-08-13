"use client";

import { useState, useMemo, useCallback } from "react";
import type { DashboardFilters } from "@/features/dashboard/components/DashboardFilterSheet";

interface UseDashboardFiltersResult {
  mode: "expenses" | "income";
  setMode: (mode: "expenses" | "income") => void;
  filters: DashboardFilters;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  setFilters: (filters: DashboardFilters) => void;
  dateRangeOverride: { start: number; end: number } | undefined;
  resetDateFilterIfNeeded: () => void;
  /** Whether anything is narrowing the view beyond the current month. */
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

const EMPTY_FILTERS: DashboardFilters = {
  datePreset: "thisMonth",
  categories: [],
  forValue: undefined,
};

export function useDashboardFilters(): UseDashboardFiltersResult {
  const [mode, setModeState] = useState<"expenses" | "income">("expenses");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  // Categories and `for` are per-mode: expense category names come from the
  // categories table while income ones come from the income rows, so a
  // selection made in one mode can never match in the other. Carrying it
  // across left the newly selected tab filtered down to nothing while the tab
  // you just left still showed its unfiltered total. The date range is
  // mode-agnostic, so it survives the switch.
  const setMode = useCallback(
    (next: "expenses" | "income") => {
      if (next === mode) return;
      setModeState(next);
      setFilters((prev) =>
        prev.categories.length === 0 && prev.forValue === undefined
          ? prev
          : { ...prev, categories: [], forValue: undefined },
      );
    },
    [mode],
  );

  const dateRangeOverride = useMemo(() => {
    if (filters.datePreset === "custom" && filters.start && filters.end) {
      return { start: filters.start, end: filters.end };
    }
    if (filters.datePreset === "last7Days") {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: end.getTime() };
    }
    if (filters.datePreset === "lastMonth") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    return undefined;
  }, [filters]);

  const resetDateFilterIfNeeded = useCallback(() => {
    if (filters.datePreset !== "thisMonth") {
      setFilters((prev) => ({
        ...prev,
        datePreset: "thisMonth",
        start: undefined,
        end: undefined,
      }));
    }
  }, [filters.datePreset]);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    !!filters.forValue ||
    filters.datePreset !== "thisMonth";

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    mode,
    setMode,
    filters,
    filtersOpen,
    setFiltersOpen,
    setFilters,
    dateRangeOverride,
    resetDateFilterIfNeeded,
    hasActiveFilters,
    clearFilters,
  };
}
