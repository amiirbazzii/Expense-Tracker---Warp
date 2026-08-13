export interface ExpenseLike {
  amount: number;
  category: string | string[];
  date: number;
  for?: string | string[];
}

export interface IncomeLike {
  amount: number;
  category: string;
  date: number;
}

export function getDateKey(date: number): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getIncomeCategoryNames(
  income: IncomeLike[],
): string[] {
  const names = new Set<string>();
  for (const inc of income) {
    if (inc.category && inc.category !== "Card Transfer") {
      names.add(inc.category);
    }
  }
  return Array.from(names);
}

export function getCategoryNames(
  categories: { name: string }[] | null | undefined,
): string[] {
  return Array.from(new Set((categories || []).map((c) => c.name).filter(Boolean)));
}

/**
 * Expense filter suggestions are taken from the rows currently in view, the
 * same way income suggestions are. Sourcing them from the categories table
 * instead offered every category ever created — including ones with no
 * expenses in the selected month or card — and picking one of those filtered
 * the tab down to nothing.
 */
export function getExpenseCategoryNames(expenses: ExpenseLike[]): string[] {
  const names = new Set<string>();
  for (const expense of expenses || []) {
    if (!expense) continue;
    const categories = Array.isArray(expense.category)
      ? expense.category
      : [expense.category];
    for (const name of categories) {
      if (name && name !== "Card Transfer") names.add(name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function getExpenseForValues(expenses: ExpenseLike[]): string[] {
  const values = new Set<string>();
  for (const expense of expenses || []) {
    if (!expense?.for) continue;
    const forValues = Array.isArray(expense.for) ? expense.for : [expense.for];
    for (const value of forValues) {
      if (value) values.add(value);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function getForValueNames(
  forValues: { value: string }[] | null | undefined,
): string[] {
  return (forValues || []).map((f) => f.value).filter(Boolean);
}
