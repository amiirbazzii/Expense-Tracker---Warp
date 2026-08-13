import { renderHook } from "@testing-library/react";
import { useDashboardDerivedData } from "@/hooks/useDashboardDerivedData";
import type { DashboardFilters } from "@/features/dashboard/components/DashboardFilterSheet";

const baseFilters: DashboardFilters = {
  datePreset: "thisMonth",
  categories: [],
  forValue: undefined,
};

const expenses = [
  { _id: "e1", amount: 10, category: ["Food"], date: 1, for: "Personal" },
  { _id: "e2", amount: 20, category: ["Food"], date: 2, for: "Work" },
  { _id: "e3", amount: 30, category: ["Transport"], date: 3, for: "Personal" },
  { _id: "e4", amount: 40, category: ["Card Transfer"], date: 4 },
];

const income = [
  { _id: "i1", amount: 100, category: "Salary", date: 1 },
  { _id: "i2", amount: 200, category: "Gifts", date: 2 },
  { _id: "i3", amount: 300, category: "Card Transfer", date: 3 },
];

const derive = (filters: DashboardFilters, mode: "expenses" | "income" = "expenses") =>
  renderHook(() => useDashboardDerivedData(mode, expenses, income, filters)).result
    .current;

describe("useDashboardDerivedData", () => {
  it("excludes Card Transfer from the rows it returns", () => {
    const { filteredExpensesForMode } = derive(baseFilters);

    expect(filteredExpensesForMode.map((e) => e._id)).toEqual(["e1", "e2", "e3"]);
  });

  it("applies the category filter to the returned rows", () => {
    const { filteredExpensesForMode } = derive({
      ...baseFilters,
      categories: ["Food"],
    });

    expect(filteredExpensesForMode.map((e) => e._id)).toEqual(["e1", "e2"]);
  });

  it("applies the `for` filter to the returned rows", () => {
    const { filteredExpensesForMode } = derive({
      ...baseFilters,
      forValue: "Personal",
    });

    expect(filteredExpensesForMode.map((e) => e._id)).toEqual(["e1", "e3"]);
  });

  it("applies the category filter to income rows", () => {
    const { filteredIncomeForMode } = derive(
      { ...baseFilters, categories: ["Salary"] },
      "income",
    );

    expect(filteredIncomeForMode.map((i) => i._id)).toEqual(["i1"]);
  });

  // The bug this guards: the category totals were filtered while the rows the
  // UI drilled into were not, so opening a category listed items that were not
  // part of the total displayed for it.
  it("returns rows that reconcile with the totals for every filter", () => {
    for (const filters of [
      baseFilters,
      { ...baseFilters, categories: ["Food"] },
      { ...baseFilters, forValue: "Personal" },
      { ...baseFilters, categories: ["Food"], forValue: "Work" },
    ]) {
      const { filteredExpensesForMode, categoryTotalsForMode, totalForMode } =
        derive(filters);

      const totalsFromRows: Record<string, number> = {};
      for (const expense of filteredExpensesForMode) {
        for (const category of expense.category) {
          totalsFromRows[category] = (totalsFromRows[category] || 0) + expense.amount;
        }
      }

      expect(totalsFromRows).toEqual(categoryTotalsForMode);
      expect(filteredExpensesForMode.reduce((s, e) => s + e.amount, 0)).toBe(
        totalForMode,
      );
    }
  });
});
