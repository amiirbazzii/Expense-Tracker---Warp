"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  DashboardFilters,
  DatePreset,
} from "@/features/dashboard/components/DashboardFilterSheet";

interface UseDashboardFiltersResult {
  mode: "expenses" | "income";
  setMode: (mode: "expenses" | "income") => void;
  filters: DashboardFilters;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  setFilters: (filters: DashboardFilters) => void;
  dateRangeOverride: { start: number; end: number } | undefined;
  resetDateFilterIfNeeded: () => void;
}

export function useDashboardFilters(): UseDashboardFiltersResult {
  const [mode, setMode] = useState<"expenses" | "income">("expenses");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    datePreset: "thisMonth",
    categories: [],
    forValue: undefined,
  });

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

  return {
    mode,
    setMode,
    filters,
    filtersOpen,
    setFiltersOpen,
    setFilters,
    dateRangeOverride,
    resetDateFilterIfNeeded,
  };
}
