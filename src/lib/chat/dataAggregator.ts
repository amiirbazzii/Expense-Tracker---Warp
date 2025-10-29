import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export interface CategorySpending {
  category: string;
  amount: number;
  count: number;
}

export interface CategoryComparison {
  categories: CategorySpending[];
  winner: string;
  difference: number;
}

export interface SpendingData {
  total: number;
  count: number;
  dateRange: {
    start: number;
    end: number;
  };
}

/**
 * Data aggregator service that computes financial summaries from user's transaction data
 * All calculations are performed server-side using actual user data
 */
export class DataAggregator {
  private client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  /**
   * Get spending by specific categories for a date range
   */
  async getCategorySpending(
    token: string,
    categories: string[],
    startDate: number,
    endDate: number
  ): Promise<CategorySpending[]> {
    try {
      // Fetch all expenses in the date range
      const expenses = await this.client.query(api.expenses.getExpensesByDateRange, {
        token,
        startDate,
        endDate
      });

      // Aggregate by category
      const categoryMap = new Map<string, { amount: number; count: number }>();

      for (const expense of expenses) {
        // Check if expense has any of the requested categories
        const matchingCategories = expense.category.filter(cat =>
          categories.some(reqCat => 
            cat.toLowerCase() === reqCat.toLowerCase()
          )
        );

        for (const category of matchingCategories) {
          const existing = categoryMap.get(category) || { amount: 0, count: 0 };
          categoryMap.set(category, {
            amount: existing.amount + expense.amount,
            count: existing.count + 1
          });
        }
      }

      // Convert to array
      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      }));
    } catch (error) {
      console.error('Error fetching category spending:', error);
      throw error;
    }
  }

  /**
   * Get total spending for a date range
   */
  async getTotalSpending(
    token: string,
    startDate: number,
    endDate: number
  ): Promise<SpendingData> {
    try {
      const expenses = await this.client.query(api.expenses.getExpensesByDateRange, {
        token,
        startDate,
        endDate
      });

      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      return {
        total,
        count: expenses.length,
        dateRange: { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error('Error fetching total spending:', error);
      throw error;
    }
  }

  /**
   * Get top N categories by spending
   */
  async getTopCategories(
    token: string,
    startDate: number,
    endDate: number,
    limit: number = 3
  ): Promise<CategorySpending[]> {
    try {
      const expenses = await this.client.query(api.expenses.getExpensesByDateRange, {
        token,
        startDate,
        endDate
      });

      // Aggregate all categories
      const categoryMap = new Map<string, { amount: number; count: number }>();

      for (const expense of expenses) {
        for (const category of expense.category) {
          const existing = categoryMap.get(category) || { amount: 0, count: 0 };
          categoryMap.set(category, {
            amount: existing.amount + expense.amount,
            count: existing.count + 1
          });
        }
      }

      // Convert to array and sort by amount
      const sorted = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      return sorted.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top categories:', error);
      throw error;
    }
  }

  /**
   * Compare spending between categories
   */
  async compareCategories(
    token: string,
    categories: string[],
    startDate: number,
    endDate: number
  ): Promise<CategoryComparison> {
    try {
      const categorySpending = await this.getCategorySpending(
        token,
        categories,
        startDate,
        endDate
      );

      // Sort by amount to find winner
      const sorted = [...categorySpending].sort((a, b) => b.amount - a.amount);

      const winner = sorted[0]?.category || 'None';
      const difference = sorted.length >= 2 
        ? sorted[0].amount - sorted[1].amount 
        : 0;

      return {
        categories: categorySpending,
        winner,
        difference
      };
    } catch (error) {
      console.error('Error comparing categories:', error);
      throw error;
    }
  }

  /**
   * Get user's categories for better query interpretation
   */
  async getUserCategories(token: string): Promise<string[]> {
    try {
      const categories = await this.client.query(api.expenses.getCategories, {
        token
      });

      return categories.map(cat => cat.name);
    } catch (error) {
      console.error('Error fetching user categories:', error);
      return [];
    }
  }

  /**
   * Get user's currency preference from settings
   */
  async getUserCurrency(token: string): Promise<string> {
    try {
      const settings = await this.client.query(api.userSettings.get, {
        token
      });

      return settings?.currency || 'USD';
    } catch (error) {
      console.error('Error fetching user currency:', error);
      return 'USD';
    }
  }

  /**
   * Get user's calendar preference from settings
   */
  async getUserCalendar(token: string): Promise<'gregorian' | 'jalali'> {
    try {
      const settings = await this.client.query(api.userSettings.get, {
        token
      });

      return settings?.calendar || 'gregorian';
    } catch (error) {
      console.error('Error fetching user calendar:', error);
      return 'gregorian';
    }
  }
}
