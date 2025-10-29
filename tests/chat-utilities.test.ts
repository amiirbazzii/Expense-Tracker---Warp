/**
 * Tests for chat backend utilities
 */

import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { resolveDateRange, extractTimeframe } from '../src/lib/chat/dateUtils';
import { interpretQuery } from '../src/lib/chat/queryInterpreter';
import moment from 'jalali-moment';

describe('Date Utils', () => {
  beforeEach(() => {
    moment.locale('en');
  });

  describe('resolveDateRange', () => {
    it('should resolve "last month" correctly', () => {
      const result = resolveDateRange('last month', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toBeTruthy();
    });

    it('should resolve "this month" correctly', () => {
      const result = resolveDateRange('this month', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toBeTruthy();
    });

    it('should resolve "last 5 months" correctly', () => {
      const result = resolveDateRange('last 5 months', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toContain('5 months');
    });

    it('should resolve "YTD" correctly', () => {
      const result = resolveDateRange('ytd', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toContain('Year to date');
    });

    it('should resolve "last quarter" correctly', () => {
      const result = resolveDateRange('last quarter', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toContain('quarter');
    });

    it('should default to this month for unknown timeframes', () => {
      const result = resolveDateRange('unknown timeframe', false);
      
      expect(result.start).toBeLessThan(result.end);
      expect(result.description).toBeTruthy();
    });
  });

  describe('extractTimeframe', () => {
    it('should extract "last month" from message', () => {
      const result = extractTimeframe('How much did I spend last month?');
      expect(result).toBe('last month');
    });

    it('should extract "last 5 months" from message', () => {
      const result = extractTimeframe('Show me spending for last 5 months');
      expect(result).toBe('last 5 months');
    });

    it('should extract "ytd" from message', () => {
      const result = extractTimeframe('What is my total spending YTD?');
      expect(result).toBe('ytd');
    });

    it('should return null when no timeframe found', () => {
      const result = extractTimeframe('How much did I spend?');
      expect(result).toBeNull();
    });
  });
});

describe('Query Interpreter', () => {
  describe('interpretQuery', () => {
    it('should detect category spending intent', () => {
      const result = interpretQuery('How much did I spend on coffee last month?');
      
      expect(result.type).toBe('category_spending');
      expect(result.categories).toContain('Coffee');
      expect(result.timeframe).toBe('last month');
    });

    it('should detect total spending intent', () => {
      const result = interpretQuery('What is my total spending this month?');
      
      expect(result.type).toBe('total_spending');
      expect(result.timeframe).toBe('this month');
    });

    it('should detect comparison intent', () => {
      const result = interpretQuery('Did I spend more on coffee or restaurant last month?');
      
      expect(result.type).toBe('compare_categories');
      expect(result.categories).toEqual(expect.arrayContaining(['Coffee', 'Restaurant']));
      expect(result.timeframe).toBe('last month');
    });

    it('should detect top categories intent', () => {
      const result = interpretQuery('Show me top 5 categories last quarter');
      
      expect(result.type).toBe('top_categories');
      expect(result.limit).toBe(5);
      expect(result.timeframe).toBe('last quarter');
    });

    it('should default to top 3 when limit not specified', () => {
      const result = interpretQuery('What are my top categories this month?');
      
      expect(result.type).toBe('top_categories');
      expect(result.limit).toBe(3);
    });

    it('should request clarification for truly ambiguous queries', () => {
      const result = interpretQuery('Tell me about my finances');
      
      expect(result.type).toBe('clarification_needed');
      expect(result.clarificationQuestion).toBeTruthy();
    });

    it('should extract multiple categories', () => {
      const result = interpretQuery('Compare coffee, restaurant, and groceries last month');
      
      expect(result.type).toBe('compare_categories');
      expect(result.categories?.length).toBeGreaterThanOrEqual(2);
    });
  });
});
