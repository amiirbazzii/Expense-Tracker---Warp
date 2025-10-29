import { formatCurrencyInMessage, formatChatTimestamp } from '@/lib/chat/formatters';
import { Currency, Calendar } from '@/contexts/SettingsContext';

describe('Chat Formatters', () => {
  describe('formatCurrencyInMessage', () => {
    it('should format USD amounts correctly', () => {
      const message = 'You spent 123.45 on coffee last month.';
      const result = formatCurrencyInMessage(message, 'USD');
      expect(result).toContain('$123');
    });

    it('should format EUR amounts correctly', () => {
      const message = 'You spent 1234.56 on restaurants.';
      const result = formatCurrencyInMessage(message, 'EUR');
      expect(result).toContain('€1,234');
    });

    it('should format IRR amounts correctly', () => {
      const message = 'You spent 50000.00 on groceries.';
      const result = formatCurrencyInMessage(message, 'IRR');
      expect(result).toContain('50,000');
      expect(result).toContain('T');
    });

    it('should handle messages without amounts', () => {
      const message = 'No transactions found for that period.';
      const result = formatCurrencyInMessage(message, 'USD');
      expect(result).toBe(message);
    });

    it('should format amounts with commas', () => {
      const message = 'Total spending: 1,234.56';
      const result = formatCurrencyInMessage(message, 'USD');
      expect(result).toContain('$1,234');
    });
  });

  describe('formatChatTimestamp', () => {
    it('should show "Just now" for very recent messages', () => {
      const now = Date.now();
      const result = formatChatTimestamp(now, 'gregorian', 'en');
      expect(result).toBe('Just now');
    });

    it('should show minutes ago for recent messages', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const result = formatChatTimestamp(fiveMinutesAgo, 'gregorian', 'en');
      expect(result).toContain('m ago');
    });

    it('should show hours ago for messages within 24 hours', () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      const result = formatChatTimestamp(twoHoursAgo, 'gregorian', 'en');
      expect(result).toContain('h ago');
    });

    it('should show absolute date for older messages', () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      const result = formatChatTimestamp(twoDaysAgo, 'gregorian', 'en');
      expect(result).not.toContain('ago');
      expect(result.length).toBeGreaterThan(5);
    });

    it('should support Persian language for relative times', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const result = formatChatTimestamp(fiveMinutesAgo, 'gregorian', 'fa');
      expect(result).toContain('دقیقه');
    });
  });
});
