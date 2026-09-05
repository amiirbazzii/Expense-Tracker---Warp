/**
 * Edit page cold load: the record arrives after the form state initialized.
 * The form must fill in from it — but never over text the user already typed.
 */
jest.mock("localforage", () => ({
  createInstance: jest.fn(() => ({
    getItem: jest.fn(async () => null), setItem: jest.fn(async (_k: string, v: any) => v), removeItem: jest.fn(async () => {}),
    clear: jest.fn(async () => {}), keys: jest.fn(async () => []), ready: jest.fn(() => Promise.resolve()),
  })),
}));
jest.mock("../convex/_generated/api", () => ({ api: {} }));

import { renderHook, act } from "@testing-library/react";
import { useExpenseForm } from "../src/hooks/useExpenseForm";

const expense = { _id: "e1", _creationTime: 1, userId: "u", amount: 40, title: "Cold edit", category: ["Food"], for: ["Me"], date: Date.UTC(2026, 0, 15), cardId: "card_1" } as any;

describe("useExpenseForm with a late-arriving record", () => {
  it("populates the form once the expense loads", () => {
    const { result, rerender } = renderHook(({ e }: { e?: typeof expense }) => useExpenseForm({ existingExpense: e, expenseId: "e1" }), { initialProps: { e: undefined } });
    expect(result.current.form.amount).toBe("");
    rerender({ e: expense });
    expect(result.current.form.amount).toBe("40");
    expect(result.current.form.title).toBe("Cold edit");
    expect(result.current.form.category).toEqual(["Food"]);
    expect(result.current.form.cardId).toBe("card_1");
    expect(result.current.form.date.getTime()).toBe(expense.date);
  });

  it("does not overwrite what the user already typed", () => {
    const { result, rerender } = renderHook(({ e }: { e?: typeof expense }) => useExpenseForm({ existingExpense: e, expenseId: "e1" }), { initialProps: { e: undefined } });
    act(() => result.current.setField("title", "Typed first"));
    rerender({ e: expense });
    expect(result.current.form.title).toBe("Typed first");
  });
});
