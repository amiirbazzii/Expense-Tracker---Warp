/**
 * Category Cache Module
 * 
 * Caches user categories for faster query parsing and reduces API calls.
 * Categories are cached in memory with a TTL (time-to-live) to ensure freshness.
 */

interface CachedCategories {
  categories: string[];
  timestamp: number;
  userId: string;
}

// In-memory cache
const categoryCache = new Map<string, CachedCategories>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get cached categories for a user
 * Returns null if cache is expired or doesn't exist
 */
export function getCachedCategories(userId: string): string[] | null {
  const cached = categoryCache.get(userId);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    // Cache expired, remove it
    categoryCache.delete(userId);
    return null;
  }
  
  return cached.categories;
}

/**
 * Set cached categories for a user
 */
export function setCachedCategories(userId: string, categories: string[]): void {
  categoryCache.set(userId, {
    categories,
    timestamp: Date.now(),
    userId
  });
}

/**
 * Clear cached categories for a user
 */
export function clearCachedCategories(userId: string): void {
  categoryCache.delete(userId);
}

/**
 * Clear all cached categories
 */
export function clearAllCachedCategories(): void {
  categoryCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ userId: string; categoryCount: number; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(categoryCache.entries()).map(([userId, cached]) => ({
    userId,
    categoryCount: cached.categories.length,
    age: now - cached.timestamp
  }));
  
  return {
    size: categoryCache.size,
    entries
  };
}
