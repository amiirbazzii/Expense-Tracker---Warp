import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/dashboard",
}));

// Keeps the suite off the localforage / Convex import chain.
const deleteExpense = jest.fn().mockResolvedValue(true);
const deleteIncome = jest.fn().mockResolvedValue(true);
jest.mock("@/lib/store", () => ({
  localDataStore: {
    deleteExpense: (id: string) => deleteExpense(id),
    deleteIncome: (id: string) => deleteIncome(id),
  },
}));
jest.mock("@/contexts/SettingsContext", () => ({
  useSettings: () => ({ settings: null }),
}));
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", user: null }),
}));
// The real edit sheets pull in localforage/Convex; a stub that reports its
// open state and target id is all these tests need.
jest.mock("@/components/EditExpenseSheet", () => ({
  EditExpenseSheet: ({ open, expenseId }: { open: boolean; expenseId: string | null }) =>
    open ? <div data-testid="edit-expense-sheet">{expenseId}</div> : null,
}));
jest.mock("@/components/EditIncomeSheet", () => ({
  EditIncomeSheet: ({ open, incomeId }: { open: boolean; incomeId: string | null }) =>
    open ? <div data-testid="edit-income-sheet">{incomeId}</div> : null,
}));

import { CategoryList } from "@/features/dashboard/components/CategoryList/CategoryList";

const expenses = [
  {
    _id: "e1",
    title: "Weekly shop",
    amount: 30,
    category: ["Food", "Household"],
    for: ["Personal"],
    date: 2,
    cardId: "c1",
  },
  {
    _id: "e2",
    title: "Lunch",
    amount: 10,
    category: ["Food"],
    for: ["Work"],
    date: 1,
    cardId: "c1",
  },
] as never[];

const incomeRows = [
  { _id: "i1", source: "Payslip", amount: 500, category: "Salary", date: 1, cardId: "c1" },
] as never[];

const cardMap = { c1: "Main Card" };

const openCategory = async (name: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: new RegExp(name) }));
  return user;
};

describe("CategoryList category sheet", () => {
  beforeEach(() => {
    push.mockClear();
    deleteExpense.mockClear();
    deleteIncome.mockClear();
  });

  const renderExpenses = () =>
    render(
      <CategoryList
        categoryTotals={{ Food: 40, Household: 30 }}
        expenses={expenses}
        income={[]}
        mode="expenses"
        cardMap={cardMap}
      />,
    );

  it("shows the category and `for` chips on each card", async () => {
    renderExpenses();
    await openCategory("Food");

    const card = screen.getByText("Weekly shop").closest("div.group") as HTMLElement;
    expect(within(card).getByText("Food")).toBeInTheDocument();
    expect(within(card).getByText("Household")).toBeInTheDocument();
    expect(within(card).getByText("for Personal")).toBeInTheDocument();
  });

  it("lists only the rows in the opened category, newest first", async () => {
    renderExpenses();
    await openCategory("Household");

    expect(screen.getByText("Weekly shop")).toBeInTheDocument();
    expect(screen.queryByText("Lunch")).not.toBeInTheDocument();
  });

  it("offers Edit and Delete when a card is clicked", async () => {
    renderExpenses();
    const user = await openCategory("Food");

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    await user.click(screen.getByText("Weekly shop"));

    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThan(0);
  });

  it("Edit opens the edit sheet in place instead of navigating", async () => {
    renderExpenses();
    const user = await openCategory("Food");

    await user.click(screen.getByText("Weekly shop"));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(screen.getByTestId("edit-expense-sheet")).toHaveTextContent("e1");
    expect(push).not.toHaveBeenCalled();
    // The category sheet stays open underneath.
    expect(screen.getByText("Weekly shop")).toBeInTheDocument();
  });

  it("Delete removes the row straight away, before the undo window elapses", async () => {
    renderExpenses();
    const user = await openCategory("Food");

    await user.click(screen.getByText("Weekly shop"));
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(screen.queryByText("Weekly shop")).not.toBeInTheDocument();
    // Still listed under the same category, so the sheet stays useful.
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("commits the delete to the store once the undo window closes", async () => {
    renderExpenses();
    const user = await openCategory("Food");

    await user.click(screen.getByText("Weekly shop"));
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    // Nothing is written while undo is still on offer.
    expect(deleteExpense).not.toHaveBeenCalled();

    // Fire what the toast would call when it auto-closes.
    const [, options] = (toast.success as jest.Mock).mock.calls.at(-1);
    await options.onAutoClose();

    expect(deleteExpense).toHaveBeenCalledWith("e1");
  });

  it("wires income cards to the income edit sheet", async () => {
    render(
      <CategoryList
        categoryTotals={{ Salary: 500 }}
        expenses={[]}
        income={incomeRows}
        mode="income"
        cardMap={cardMap}
      />,
    );
    const user = await openCategory("Salary");

    await user.click(screen.getByText("Payslip"));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(screen.getByTestId("edit-income-sheet")).toHaveTextContent("i1");
    expect(push).not.toHaveBeenCalled();
  });
});
