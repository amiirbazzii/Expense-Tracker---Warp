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

export function getForValueNames(
  forValues: { value: string }[] | null | undefined,
): string[] {
  return (forValues || []).map((f) => f.value).filter(Boolean);
}
