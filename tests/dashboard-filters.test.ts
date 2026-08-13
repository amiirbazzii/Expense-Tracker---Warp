import { renderHook, act } from "@testing-library/react";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

describe("useDashboardFilters", () => {
  it("starts unfiltered", () => {
    const { result } = renderHook(() => useDashboardFilters());

    expect(result.current.mode).toBe("expenses");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // The bug this guards: expense category names come from the categories
  // table and income ones from the income rows, so the two sets are disjoint.
  // Carrying a selection across a mode switch filtered the newly active tab
  // down to nothing while the tab just left still showed its unfiltered total.
  it("drops the category filter when the mode changes", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.setFilters({
        datePreset: "thisMonth",
        categories: ["Groceries"],
        forValue: "Personal",
      });
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.setMode("income"));

    expect(result.current.mode).toBe("income");
    expect(result.current.filters.categories).toEqual([]);
    expect(result.current.filters.forValue).toBeUndefined();
  });

  it("keeps the date range across a mode change", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.setFilters({
        datePreset: "lastMonth",
        categories: ["Groceries"],
      });
    });
    act(() => result.current.setMode("income"));

    expect(result.current.filters.datePreset).toBe("lastMonth");
    expect(result.current.dateRangeOverride).toBeDefined();
  });

  it("leaves filters alone when the mode is re-selected", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.setFilters({
        datePreset: "thisMonth",
        categories: ["Groceries"],
      });
    });
    act(() => result.current.setMode("expenses"));

    expect(result.current.filters.categories).toEqual(["Groceries"]);
  });

  it("clearFilters resets everything", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.setFilters({
        datePreset: "last7Days",
        categories: ["Groceries"],
        forValue: "Work",
      });
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filters.categories).toEqual([]);
    expect(result.current.filters.forValue).toBeUndefined();
    expect(result.current.dateRangeOverride).toBeUndefined();
  });

  it("treats a non-default date preset as an active filter", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.setFilters({ datePreset: "last7Days", categories: [] });
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });
});
