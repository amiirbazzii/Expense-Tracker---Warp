import moment from 'jalali-moment';

export interface DateRange {
  start: number;
  end: number;
  description: string;
}

/**
 * Resolves natural language date phrases into timestamp ranges
 * Supports both Gregorian and Jalali calendars
 */
export function resolveDateRange(
  timeframe: string,
  useJalali: boolean = false
): DateRange {
  moment.locale(useJalali ? 'fa' : 'en');
  const now = moment();
  const normalized = timeframe.toLowerCase().trim();

  // Last month
  if (normalized === 'last month') {
    const start = now.clone().subtract(1, 'month').startOf(useJalali ? 'jMonth' : 'month');
    const end = now.clone().subtract(1, 'month').endOf(useJalali ? 'jMonth' : 'month');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: `${start.format(useJalali ? 'jMMMM jYYYY' : 'MMMM YYYY')}`
    };
  }

  // This month
  if (normalized === 'this month') {
    const start = now.clone().startOf(useJalali ? 'jMonth' : 'month');
    const end = now.clone().endOf(useJalali ? 'jMonth' : 'month');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: `${start.format(useJalali ? 'jMMMM jYYYY' : 'MMMM YYYY')}`
    };
  }

  // Last N months (e.g., "last 5 months", "last 3 months")
  const lastMonthsMatch = normalized.match(/last (\d+) months?/);
  if (lastMonthsMatch) {
    const months = parseInt(lastMonthsMatch[1]);
    const start = now.clone().subtract(months, 'months').startOf(useJalali ? 'jMonth' : 'month');
    const end = now.clone().endOf(useJalali ? 'jMonth' : 'month');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: `Last ${months} months`
    };
  }

  // Last quarter
  if (normalized === 'last quarter') {
    const start = now.clone().subtract(3, 'months').startOf(useJalali ? 'jMonth' : 'month');
    const end = now.clone().subtract(1, 'month').endOf(useJalali ? 'jMonth' : 'month');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: 'Last quarter'
    };
  }

  // This quarter
  if (normalized === 'this quarter') {
    const currentMonth = useJalali ? now.jMonth() : now.month();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const start = now.clone().month(quarterStartMonth).startOf(useJalali ? 'jMonth' : 'month');
    const end = now.clone().endOf(useJalali ? 'jMonth' : 'month');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: 'This quarter'
    };
  }

  // Year to date (YTD)
  if (normalized === 'ytd' || normalized === 'year to date') {
    const start = now.clone().startOf(useJalali ? 'jYear' : 'year');
    const end = now.clone().endOf('day');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: `Year to date (${start.format(useJalali ? 'jYYYY' : 'YYYY')})`
    };
  }

  // This year
  if (normalized === 'this year') {
    const start = now.clone().startOf(useJalali ? 'jYear' : 'year');
    const end = now.clone().endOf(useJalali ? 'jYear' : 'year');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: start.format(useJalali ? 'jYYYY' : 'YYYY')
    };
  }

  // Last year
  if (normalized === 'last year') {
    const start = now.clone().subtract(1, 'year').startOf(useJalali ? 'jYear' : 'year');
    const end = now.clone().subtract(1, 'year').endOf(useJalali ? 'jYear' : 'year');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: start.format(useJalali ? 'jYYYY' : 'YYYY')
    };
  }

  // Last N days (e.g., "last 7 days", "last 30 days")
  const lastDaysMatch = normalized.match(/last (\d+) days?/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1]);
    const start = now.clone().subtract(days, 'days').startOf('day');
    const end = now.clone().endOf('day');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: `Last ${days} days`
    };
  }

  // Last week
  if (normalized === 'last week') {
    const start = now.clone().subtract(1, 'week').startOf('week');
    const end = now.clone().subtract(1, 'week').endOf('week');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: 'Last week'
    };
  }

  // This week
  if (normalized === 'this week') {
    const start = now.clone().startOf('week');
    const end = now.clone().endOf('week');
    return {
      start: start.valueOf(),
      end: end.valueOf(),
      description: 'This week'
    };
  }

  // Default to this month if no match
  const start = now.clone().startOf(useJalali ? 'jMonth' : 'month');
  const end = now.clone().endOf(useJalali ? 'jMonth' : 'month');
  return {
    start: start.valueOf(),
    end: end.valueOf(),
    description: `${start.format(useJalali ? 'jMMMM jYYYY' : 'MMMM YYYY')}`
  };
}

/**
 * Extracts timeframe phrases from user messages
 */
export function extractTimeframe(message: string): string | null {
  const normalized = message.toLowerCase();
  
  const patterns = [
    /last \d+ months?/,
    /last \d+ days?/,
    /last month/,
    /this month/,
    /last quarter/,
    /this quarter/,
    /last year/,
    /this year/,
    /ytd|year to date/,
    /last week/,
    /this week/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}
