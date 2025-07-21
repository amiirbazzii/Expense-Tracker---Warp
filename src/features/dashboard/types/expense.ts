import { Id } from "../../../../convex/_generated/dataModel";

export interface Expense {
  _id: Id<"expenses">;
  _creationTime: number;
  title: string;
  amount: number;
  category: string[];
  date: number;
  for?: string;
  cardId: string;
}

export interface MonthlyData {
  totalExpenses: number;
  totalIncome: number;
  totalCount: number;
  categoryTotals: Record<string, number>;
  dailyTotals: Record<string, number>;
}

export type TabType = 'analytics' | 'expenses';
