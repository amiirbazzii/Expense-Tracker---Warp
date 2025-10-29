import { Currency, Calendar } from "@/contexts/SettingsContext";
import { formatCurrency as baseCurrencyFormatter, formatDate as baseDateFormatter } from "@/lib/formatters";

/**
 * Format currency amounts in chat messages
 * Replaces numeric patterns with formatted currency
 */
export function formatCurrencyInMessage(message: string, currency: Currency): string {
  let formatted = message;

  // Track already replaced positions to avoid double-replacement
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];

  // Pattern 1: Match amounts with currency symbols: $123.45, €1,234.56, £100, T50,000
  const symbolPattern = /(\$|€|£|T)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  let match;
  while ((match = symbolPattern.exec(message)) !== null) {
    const numericAmount = parseFloat(match[2].replace(/,/g, ''));
    const replacement = baseCurrencyFormatter(numericAmount, currency);
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      replacement
    });
  }

  // Pattern 2: Match amounts with currency codes: 123.45 USD, 1234 EUR
  const codePattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(USD|EUR|GBP|IRR)/g;
  while ((match = codePattern.exec(message)) !== null) {
    // Check if this overlaps with existing replacement
    const overlaps = replacements.some(r => 
      match!.index < r.end && match!.index + match![0].length > r.start
    );
    if (!overlaps) {
      const numericAmount = parseFloat(match[1].replace(/,/g, ''));
      const replacement = baseCurrencyFormatter(numericAmount, currency);
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement
      });
    }
  }

  // Pattern 3: Match standalone numbers with commas: 1,234.56
  const commaPattern = /\b(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)\b/g;
  while ((match = commaPattern.exec(message)) !== null) {
    const overlaps = replacements.some(r => 
      match!.index < r.end && match!.index + match![0].length > r.start
    );
    if (!overlaps) {
      const numericAmount = parseFloat(match[1].replace(/,/g, ''));
      const replacement = baseCurrencyFormatter(numericAmount, currency);
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement
      });
    }
  }

  // Pattern 4: Match standalone decimal numbers: 123.45
  const decimalPattern = /\b(\d+\.\d{2})\b/g;
  while ((match = decimalPattern.exec(message)) !== null) {
    const overlaps = replacements.some(r => 
      match!.index < r.end && match!.index + match![0].length > r.start
    );
    if (!overlaps) {
      const numericAmount = parseFloat(match[1]);
      // Only format if it looks like a currency amount
      if (numericAmount >= 0.01 && numericAmount < 1000000000) {
        const replacement = baseCurrencyFormatter(numericAmount, currency);
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          replacement
        });
      }
    }
  }

  // Sort replacements by position (descending) to replace from end to start
  replacements.sort((a, b) => b.start - a.start);

  // Apply replacements
  for (const { start, end, replacement } of replacements) {
    formatted = formatted.substring(0, start) + replacement + formatted.substring(end);
  }

  return formatted;
}

/**
 * Format a timestamp for display in chat
 * Returns relative time for recent messages, absolute for older ones
 */
export function formatChatTimestamp(
  timestamp: number,
  calendar: Calendar,
  language: string = 'en'
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // If less than 24 hours, show relative time
  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    const minutes = Math.floor((diffInHours - hours) * 60);
    
    if (hours === 0) {
      if (minutes === 0) {
        return language === 'fa' ? 'همین الان' : 'Just now';
      }
      return language === 'fa' ? `${minutes} دقیقه پیش` : `${minutes}m ago`;
    }
    return language === 'fa' ? `${hours} ساعت پیش` : `${hours}h ago`;
  }

  // For older messages, show absolute time with calendar preference
  if (calendar === 'jalali') {
    // Use Jalali calendar for Persian users
    return baseDateFormatter(date, calendar, 'jYYYY/jMM/jDD HH:mm');
  }

  // Use Gregorian calendar
  return date.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: language !== 'fa'
  });
}

/**
 * Format date ranges in assistant responses
 * Converts date range descriptions to localized format
 */
export function formatDateRangeInMessage(
  message: string,
  calendar: Calendar,
  language: string = 'en'
): string {
  // This function can be extended to replace date range descriptions
  // with formatted dates if needed. For now, we keep the natural language
  // descriptions as they are more user-friendly.
  
  // Example patterns that could be replaced:
  // "last month" -> "November 2024" or "آبان ۱۴۰۳"
  // "last 5 months" -> "June - October 2024"
  
  // For v1, we'll keep natural language descriptions as they're clearer
  return message;
}
