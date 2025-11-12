import { extractTimeframe } from './dateUtils';
import { getCachedCategories, setCachedCategories } from './categoryCache';

export interface QueryIntent {
  type: 'category_spending' | 'total_spending' | 'compare_categories' | 'top_categories' | 'clarification_needed';
  categories?: string[];
  timeframe?: string;
  limit?: number;
  clarificationQuestion?: string;
}

// Common category keywords - this should ideally be populated from user's actual categories
const DEFAULT_CATEGORIES = [
  'coffee', 'food', 'restaurant', 'groceries', 'transport', 'transportation',
  'entertainment', 'shopping', 'utilities', 'rent', 'mortgage', 'insurance',
  'health', 'healthcare', 'fitness', 'gym', 'education', 'books',
  'travel', 'vacation', 'gas', 'fuel', 'clothing', 'electronics',
  'subscriptions', 'streaming', 'internet', 'phone', 'investments',
  'savings', 'gifts', 'charity', 'pets', 'home', 'car', 'taxi', 'uber'
];

/**
 * Parses user messages to extract intent, categories, and timeframes
 * This is a simple rule-based interpreter that can be enhanced with AI later
 * 
 * Performance optimization: Uses cached categories when available
 */
export function interpretQuery(message: string, userId?: string): QueryIntent {
  const normalized = message.toLowerCase().trim();
  
  // Extract timeframe
  const timeframe = extractTimeframe(message);

  // Check for comparison queries
  if (normalized.includes('more') || normalized.includes('compare') || normalized.includes('vs') || normalized.includes('versus')) {
    const categories = extractCategories(message, userId);
    
    if (categories.length >= 2) {
      return {
        type: 'compare_categories',
        categories,
        timeframe: timeframe || undefined
      };
    }
    
    // Need clarification on what to compare
    if (categories.length === 1) {
      return {
        type: 'clarification_needed',
        clarificationQuestion: `What would you like to compare "${categories[0]}" with?`
      };
    }
    
    return {
      type: 'clarification_needed',
      clarificationQuestion: 'Which categories would you like to compare?'
    };
  }

  // Check for top categories queries
  if (normalized.includes('top') || normalized.includes('biggest') || normalized.includes('most')) {
    const limitMatch = normalized.match(/top (\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 3;
    
    return {
      type: 'top_categories',
      limit,
      timeframe: timeframe || undefined
    };
  }

  // Check for specific category spending
  const categories = extractCategories(message, userId);
  if (categories.length > 0) {
    return {
      type: 'category_spending',
      categories,
      timeframe: timeframe || undefined
    };
  }

  // Check for total spending queries
  if (
    normalized.includes('total') || 
    normalized.includes('spent') || 
    normalized.includes('spending') ||
    normalized.includes('how much')
  ) {
    // If no specific category mentioned, it's total spending
    if (categories.length === 0) {
      return {
        type: 'total_spending',
        timeframe: timeframe || undefined
      };
    }
    
    return {
      type: 'category_spending',
      categories,
      timeframe: timeframe || undefined
    };
  }

  // Need clarification if we can't determine intent
  return {
    type: 'clarification_needed',
    clarificationQuestion: 'Could you please specify what you\'d like to know about your spending? For example, you can ask about specific categories, total spending, or comparisons.'
  };
}

/**
 * Extracts potential category names from user message
 * This is a simple implementation that looks for common category keywords
 * 
 * Performance optimization: Uses cached categories when available
 */
function extractCategories(message: string, userId?: string): string[] {
  const normalized = message.toLowerCase();
  const categories: string[] = [];
  
  // Performance optimization: Try to get cached categories first
  let categoryList = DEFAULT_CATEGORIES;
  if (userId) {
    const cached = getCachedCategories(userId);
    if (cached && cached.length > 0) {
      categoryList = cached.map(c => c.toLowerCase());
    }
  }

  for (const category of categoryList) {
    // Look for whole word matches
    const regex = new RegExp(`\\b${category}\\b`, 'i');
    if (regex.test(normalized)) {
      // Capitalize first letter
      categories.push(category.charAt(0).toUpperCase() + category.slice(1));
    }
  }

  return Array.from(new Set(categories)); // Remove duplicates
}

/**
 * Update the cached categories for a user
 * This should be called when fetching user's actual categories from the database
 */
export function updateCachedCategories(userId: string, categories: string[]): void {
  setCachedCategories(userId, categories);
}

/**
 * Validates if a query has enough information to proceed
 */
export function needsClarification(intent: QueryIntent): boolean {
  if (intent.type === 'clarification_needed') {
    return true;
  }

  // Check if timeframe is missing for queries that need it
  if (!intent.timeframe) {
    if (intent.type === 'category_spending' || 
        intent.type === 'compare_categories' || 
        intent.type === 'top_categories') {
      return true;
    }
  }

  return false;
}
