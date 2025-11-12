import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { setCachedCategories } from './categoryCache';

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

      console.log(`[DataAggregator] Fetched ${expenses.length} expenses for date range`);
      console.log(`[DataAggregator] Looking for categories:`, categories);

      // Aggregate by category (using normalized lowercase keys to avoid case sensitivity issues)
      const categoryMap = new Map<string, { amount: number; count: number; displayName: string }>();

      for (const expense of expenses) {
        // Check if expense has any of the requested categories
        const matchingCategories = expense.category.filter(cat =>
          categories.some(reqCat => 
            cat.toLowerCase() === reqCat.toLowerCase()
          )
        );

        if (matchingCategories.length > 0) {
          console.log(`[DataAggregator] Expense matched:`, {
            title: expense.title,
            amount: expense.amount,
            date: new Date(expense.date).toISOString(),
            categories: expense.category,
            matchingCategories,
            willAddToEachCategory: matchingCategories.length > 1 ? 'YES - SPLITTING AMOUNT' : 'NO'
          });
        }

        // IMPORTANT: If an expense has multiple matching categories,
        // we need to decide: split the amount or add full amount to each?
        // Current behavior: Add full amount to each matching category
        // This means if expense is 1000 with ["test", "food"] and user asks for both,
        // it will show test: 1000, food: 1000 (total 2000 - which might be confusing)
        
        // Alternative: Split the amount proportionally
        // const amountPerCategory = matchingCategories.length > 0 ? expense.amount / matchingCategories.length : 0;
        
        for (const category of matchingCategories) {
          // Use lowercase as key to avoid case sensitivity issues
          const normalizedKey = category.toLowerCase();
          const existing = categoryMap.get(normalizedKey) || { amount: 0, count: 0, displayName: category };
          
          // Add the FULL expense amount to this category
          // Note: If expense has multiple matching categories, amount is added to each
          categoryMap.set(normalizedKey, {
            amount: existing.amount + expense.amount,
            count: existing.count + 1,
            displayName: existing.displayName // Keep the first display name we saw
          });
        }
      }

      const result = Array.from(categoryMap.entries()).map(([_, data]) => ({
        category: data.displayName,
        amount: data.amount,
        count: data.count
      }));

      console.log(`[DataAggregator] Final result:`, result);
      console.log(`[DataAggregator] Total across all categories:`, result.reduce((sum, r) => sum + r.amount, 0));

      // Convert to array
      return result;
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

      console.log(`[DataAggregator] getTotalSpending: Fetched ${expenses.length} expenses`);
      console.log(`[DataAggregator] Date range filter (timestamps):`, {
        startDate: startDate,
        endDate: endDate,
        startDateUTC: new Date(startDate).toISOString(),
        endDateUTC: new Date(endDate).toISOString()
      });
      
      // Log first and last few expenses for debugging
      if (expenses.length > 0) {
        const sortedExpenses = [...expenses].sort((a, b) => a.date - b.date);
        console.log(`[DataAggregator] First 3 expenses (by date):`, sortedExpenses.slice(0, 3).map(e => ({
          title: e.title,
          amount: e.amount,
          date: new Date(e.date).toISOString(),
          dateTimestamp: e.date,
          isInRange: e.date >= startDate && e.date <= endDate
        })));
        
        if (expenses.length > 3) {
          console.log(`[DataAggregator] Last 3 expenses (by date):`, sortedExpenses.slice(-3).map(e => ({
            title: e.title,
            amount: e.amount,
            date: new Date(e.date).toISOString(),
            dateTimestamp: e.date,
            isInRange: e.date >= startDate && e.date <= endDate
          })));
        }
      }

      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      console.log(`[DataAggregator] Total calculated:`, {
        total,
        count: expenses.length,
        average: expenses.length > 0 ? total / expenses.length : 0
      });

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

      // Aggregate all categories (using normalized lowercase keys)
      const categoryMap = new Map<string, { amount: number; count: number; displayName: string }>();

      for (const expense of expenses) {
        for (const category of expense.category) {
          // Use lowercase as key to avoid case sensitivity issues
          const normalizedKey = category.toLowerCase();
          const existing = categoryMap.get(normalizedKey) || { amount: 0, count: 0, displayName: category };
          categoryMap.set(normalizedKey, {
            amount: existing.amount + expense.amount,
            count: existing.count + 1,
            displayName: existing.displayName // Keep the first display name we saw
          });
        }
      }

      // Convert to array and sort by amount
      const sorted = Array.from(categoryMap.entries())
        .map(([_, data]) => ({
          category: data.displayName,
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
   * Performance optimization: Caches categories for faster subsequent queries
   */
  async getUserCategories(token: string, userId?: string): Promise<string[]> {
    try {
      const categories = await this.client.query(api.expenses.getCategories, {
        token
      });

      const categoryNames = categories.map(cat => cat.name);
      
      // Performance optimization: Cache categories if userId is provided
      if (userId && categoryNames.length > 0) {
        setCachedCategories(userId, categoryNames);
      }

      return categoryNames;
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
