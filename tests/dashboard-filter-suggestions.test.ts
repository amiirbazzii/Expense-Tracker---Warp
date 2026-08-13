import { renderHook } from "@testing-library/react";
import {
  getExpenseCategoryNames,
  getExpenseForValues,
  getIncomeCategoryNames,
} from "@/utils/dashboard";
import { useDashboardDerivedData } from "@/hooks/useDashboardDerivedData";
import type { DashboardFilters } from "@/features/dashboard/components/DashboardFilterSheet";

const base: DashboardFilters = {
  datePreset: "thisMonth",
  categories: [],
  forValue: undefined,
};

// Rows "in view" — already narrowed to the selected month and card.
const expenses = [
  { amount: 10, category: ["Food"], date: 1, for: ["Personal"] },
  { amount: 20, category: ["Transport", "Travel"], date: 2, for: ["Work"] },
  { amount: 40, category: ["Card Transfer"], date: 3 },
];

const income = [
  { amount: 100, category: "Salary", date: 1 },
  { amount: 300, category: "Card Transfer", date: 2 },
];

describe("filter suggestions", () => {
  it("collects expense categories from the rows in view, excluding transfers", () => {
    expect(getExpenseCategoryNames(expenses)).toEqual([
      "Food",
      "Transport",
      "Travel",
    ]);
  });

  it("collects `for` values from the rows in view", () => {
    expect(getExpenseForValues(expenses)).toEqual(["Personal", "Work"]);
  });

  it("does not suggest categories that only exist outside the rows in view", () => {
    // "Rent" exists as a category the user created, but has no expense in the
    // current month. It must not be offered, because selecting it would filter
    // the tab down to nothing.
    expect(getExpenseCategoryNames(expenses)).not.toContain("Rent");
  });

  it("tolerates a non-array category field", () => {
    expect(
      getExpenseCategoryNames([
        { amount: 5, category: "Food" as unknown as string[], date: 1 },
      ]),
    ).toEqual(["Food"]);
  });

  // The property that was broken: expense suggestions came from the categories
  // table, so the sheet offered options with no matching rows. Applying one
  // zeroed the Expenses tab and surfaced the empty state. Income never had this
  // problem because its options were always derived from the rows in view.
  it("every suggested expense category yields a non-empty result", () => {
    for (const category of getExpenseCategoryNames(expenses)) {
      const { result } = renderHook(() =>
        useDashboardDerivedData(
          "expenses",
          expenses,
          income,
          { ...base, categories: [category] },
        ),
      );

      expect(result.current.filteredExpensesForMode.length).toBeGreaterThan(0);
      expect(result.current.totalForMode).toBeGreaterThan(0);
    }
  });

  it("every suggested `for` value yields a non-empty result", () => {
    for (const forValue of getExpenseForValues(expenses)) {
      const { result } = renderHook(() =>
        useDashboardDerivedData("expenses", expenses, income, {
          ...base,
          forValue,
        }),
      );

      expect(result.current.filteredExpensesForMode.length).toBeGreaterThan(0);
    }
  });

  it("every suggested income category yields a non-empty result", () => {
    for (const category of getIncomeCategoryNames(income)) {
      const { result } = renderHook(() =>
        useDashboardDerivedData("income", expenses, income, {
          ...base,
          categories: [category],
        }),
      );

      expect(result.current.filteredIncomeForMode.length).toBeGreaterThan(0);
    }
  });
});
