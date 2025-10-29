# Chat Calendar and Date Range Fix

## Issues Fixed

### Issue 1: Calendar Preference Not Respected
**Problem**: The chat API was using Gregorian calendar for all date calculations, even when users had Jalali calendar selected in their settings.

**Root Cause**: The `resolveDateRange` function was being called with hardcoded `false` for the `useJalali` parameter in the API route.

**Solution**:
1. Added `getUserCalendar()` method to `DataAggregator` to fetch user's calendar preference
2. Updated API route to fetch calendar preference and pass it through the function chain
3. Modified `executeFunction()` to accept and use the `useJalali` parameter
4. Updated `processChatMessage()` to receive and propagate the calendar preference

### Issue 2: "Today" Not Supported
**Problem**: When users asked about "today", the system defaulted to "this month", returning incorrect results.

**Root Cause**: The `resolveDateRange` function didn't have cases for "today" or "yesterday".

**Solution**:
1. Added "today" case to `resolveDateRange()`:
   - Returns start of current day to end of current day
   - Description: "today"

2. Added "yesterday" case to `resolveDateRange()`:
   - Returns start of previous day to end of previous day
   - Description: "yesterday"

3. Updated `extractTimeframe()` to recognize "today" and "yesterday" patterns

## Files Modified

### `src/lib/chat/dateUtils.ts`
- Added "today" and "yesterday" date range resolution
- Updated pattern matching to include new timeframes

### `src/lib/chat/dataAggregator.ts`
- Added `getUserCalendar()` method to fetch calendar preference from settings

### `src/app/api/chat/route.ts`
- Added `getUserCalendar()` helper function
- Updated `executeFunction()` to accept `useJalali` parameter
- Updated `processChatMessage()` to accept and use `useJalali` parameter
- Modified POST handler to fetch calendar preference and pass it through

### `tests/date-utils.test.ts` (New)
- Comprehensive tests for date range resolution
- Tests for both Gregorian and Jalali calendars
- Tests for "today", "yesterday", and other timeframes
- Tests for timeframe extraction from messages

## How It Works Now

1. **User sends a message**: "How much did I spend today?"

2. **API fetches user preferences**:
   ```typescript
   const calendar = await getUserCalendar(token, aggregator);
   const useJalali = calendar === 'jalali';
   ```

3. **Date range is resolved with correct calendar**:
   ```typescript
   const dateRange = resolveDateRange('today', useJalali);
   ```

4. **For Jalali calendar users**:
   - "today" uses current Jalali day boundaries
   - "this month" uses current Jalali month boundaries
   - All date calculations respect Jalali calendar

5. **For Gregorian calendar users**:
   - Standard Gregorian date calculations
   - Familiar month/year names

## Testing

Run the date utils tests:
```bash
npm test -- tests/date-utils.test.ts
```

All 13 tests should pass, covering:
- Today/yesterday resolution
- Gregorian calendar date ranges
- Jalali calendar date ranges
- Timeframe extraction from messages

## Example Scenarios

### Scenario 1: Jalali Calendar User Asks About Today
**User Settings**: Calendar = Jalali, Currency = IRR
**User Message**: "How much did I spend today?"
**System Behavior**:
- Resolves "today" using Jalali calendar day boundaries
- Queries expenses within current Jalali day
- Returns accurate results for today only

### Scenario 2: Gregorian Calendar User Asks About This Month
**User Settings**: Calendar = Gregorian, Currency = USD
**User Message**: "What's my spending this month?"
**System Behavior**:
- Resolves "this month" using Gregorian calendar month boundaries
- Queries expenses within current Gregorian month
- Returns results with "October 2024" description

### Scenario 3: Jalali Calendar User Asks About Last Month
**User Settings**: Calendar = Jalali, Currency = IRR
**User Message**: "Show me last month's expenses"
**System Behavior**:
- Resolves "last month" using Jalali calendar month boundaries
- Queries expenses within previous Jalali month
- Returns results with Jalali month name (e.g., "مهر ۱۴۰۳")

## Supported Timeframes

The system now supports:
- **today** - Current day
- **yesterday** - Previous day
- **this week** - Current week
- **last week** - Previous week
- **this month** - Current month (respects calendar)
- **last month** - Previous month (respects calendar)
- **last N months** - Previous N months (respects calendar)
- **last N days** - Previous N days
- **this quarter** - Current quarter
- **last quarter** - Previous quarter
- **this year** - Current year (respects calendar)
- **last year** - Previous year (respects calendar)
- **ytd / year to date** - From start of year to now (respects calendar)
- **all time** - All available data

All timeframes respect the user's calendar preference (Gregorian or Jalali).
