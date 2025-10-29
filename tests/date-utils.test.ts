import { resolveDateRange, extractTimeframe } from '@/lib/chat/dateUtils';
import moment from 'jalali-moment';

describe('Date Utils', () => {
  describe('resolveDateRange', () => {
    it('should resolve "today" correctly', () => {
      const result = resolveDateRange('today', false);
      const now = moment();
      const expectedStart = now.clone().startOf('day').valueOf();
      const expectedEnd = now.clone().endOf('day').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
      expect(result.description).toBe('today');
    });

    it('should resolve "yesterday" correctly', () => {
      const result = resolveDateRange('yesterday', false);
      const now = moment();
      const expectedStart = now.clone().subtract(1, 'day').startOf('day').valueOf();
      const expectedEnd = now.clone().subtract(1, 'day').endOf('day').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
      expect(result.description).toBe('yesterday');
    });

    it('should resolve "this month" with Gregorian calendar', () => {
      const result = resolveDateRange('this month', false);
      const now = moment();
      const expectedStart = now.clone().startOf('month').valueOf();
      const expectedEnd = now.clone().endOf('month').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
      expect(result.description).toContain(now.format('MMMM YYYY'));
    });

    it('should resolve "this month" with Jalali calendar', () => {
      const result = resolveDateRange('this month', true);
      const now = moment().locale('fa');
      const expectedStart = now.clone().startOf('jMonth').valueOf();
      const expectedEnd = now.clone().endOf('jMonth').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
      // Description should contain Jalali month name
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should resolve "last month" with Gregorian calendar', () => {
      const result = resolveDateRange('last month', false);
      const now = moment();
      const lastMonth = now.clone().subtract(1, 'month');
      const expectedStart = lastMonth.clone().startOf('month').valueOf();
      const expectedEnd = lastMonth.clone().endOf('month').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it('should resolve "last month" with Jalali calendar', () => {
      const result = resolveDateRange('last month', true);
      const now = moment().locale('fa');
      const lastMonth = now.clone().subtract(1, 'jMonth');
      const expectedStart = lastMonth.clone().startOf('jMonth').valueOf();
      const expectedEnd = lastMonth.clone().endOf('jMonth').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it('should resolve "last 7 days" correctly', () => {
      const result = resolveDateRange('last 7 days', false);
      const now = moment();
      const expectedStart = now.clone().subtract(7, 'days').startOf('day').valueOf();
      const expectedEnd = now.clone().endOf('day').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
      expect(result.description).toBe('Last 7 days');
    });

    it('should default to "this month" for unrecognized timeframes', () => {
      const result = resolveDateRange('some random text', false);
      const now = moment();
      const expectedStart = now.clone().startOf('month').valueOf();
      const expectedEnd = now.clone().endOf('month').valueOf();
      
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });
  });

  describe('extractTimeframe', () => {
    it('should extract "today" from message', () => {
      const result = extractTimeframe('How much did I spend today?');
      expect(result).toBe('today');
    });

    it('should extract "yesterday" from message', () => {
      const result = extractTimeframe('What did I spend yesterday?');
      expect(result).toBe('yesterday');
    });

    it('should extract "last month" from message', () => {
      const result = extractTimeframe('Show me expenses from last month');
      expect(result).toBe('last month');
    });

    it('should extract "last 5 months" from message', () => {
      const result = extractTimeframe('Total spending in the last 5 months');
      expect(result).toBe('last 5 months');
    });

    it('should return null for messages without timeframes', () => {
      const result = extractTimeframe('How much did I spend on coffee?');
      expect(result).toBeNull();
    });
  });
});
