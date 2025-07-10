export interface Expense {
  _id: string;
  _creationTime: number;
  title: string;
  amount: number;
  category: string[];
  date: number;
  for?: string;
}

export interface MonthlyData {
  totalAmount: number;
  totalCount: number;
  categoryTotals: Record<string, number>;
  dailyTotals: Record<string, number>;
}

export type TabType = 'analytics' | 'expenses';
