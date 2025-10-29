# Chat Formatting Features

This document describes the currency and date formatting features implemented for the AI chat interface.

## Currency Formatting

### Overview
The chat automatically formats currency amounts in assistant responses based on the user's currency preference from their settings.

### Supported Currencies
- **USD** ($): US Dollar
- **EUR** (€): Euro
- **GBP** (£): British Pound
- **IRR** (T): Iranian Rial (displayed as Toman)

### How It Works

1. **Server-Side Enhancement**: The API route fetches the user's currency preference and includes it in the system prompt sent to OpenRouter.

2. **Client-Side Formatting**: The `MessageBubble` component applies additional formatting to ensure consistent display:
   - Detects numeric amounts in various formats (123.45, 1,234.56, etc.)
   - Replaces them with properly formatted currency strings
   - Uses the user's currency preference from settings

3. **Pattern Matching**: The formatter recognizes:
   - Amounts with currency symbols: `$123.45`, `€1,234.56`
   - Amounts with currency codes: `123.45 USD`, `1234 EUR`
   - Standalone numbers with commas: `1,234.56`
   - Decimal numbers: `123.45`

### Example Transformations

**USD:**
- Input: "You spent 123.45 on coffee"
- Output: "You spent $123.45 on coffee"

**EUR:**
- Input: "Total: 1234.56"
- Output: "Total: €1,234.56"

**IRR:**
- Input: "You spent 50000 on groceries"
- Output: "You spent 50,000 T on groceries"

## Date Formatting

### Timestamp Display

Chat message timestamps are formatted based on recency and user preferences:

#### Relative Time (< 24 hours)
- **Just now**: For messages sent within the last minute
- **Xm ago**: For messages sent X minutes ago
- **Xh ago**: For messages sent X hours ago

#### Absolute Time (> 24 hours)
- **Gregorian Calendar**: "Nov 15, 3:45 PM"
- **Jalali Calendar**: "1403/08/25 15:45"

### Language Support

The formatter supports both English and Persian (Farsi):

**English:**
- "Just now"
- "5m ago"
- "2h ago"

**Persian:**
- "همین الان" (Just now)
- "۵ دقیقه پیش" (5 minutes ago)
- "۲ ساعت پیش" (2 hours ago)

### Calendar Support

Users can choose between:
- **Gregorian Calendar**: Standard Western calendar
- **Jalali Calendar**: Persian/Iranian calendar (Solar Hijri)

The chat respects this preference when displaying absolute timestamps.

## Implementation Details

### Files Modified

1. **`src/lib/chat/formatters.ts`**: Core formatting utilities
   - `formatCurrencyInMessage()`: Formats currency amounts in text
   - `formatChatTimestamp()`: Formats timestamps with calendar support
   - `formatDateRangeInMessage()`: Placeholder for future date range formatting

2. **`src/components/chat/MessageBubble.tsx`**: Message display component
   - Integrates with `SettingsContext` to get user preferences
   - Applies formatting to message content and timestamps

3. **`src/app/api/chat/route.ts`**: Chat API endpoint
   - Fetches user's currency preference
   - Enhances system prompt with currency information
   - Ensures AI responses include currency symbols

4. **`src/lib/chat/dataAggregator.ts`**: Data aggregation service
   - Added `getUserCurrency()` method to fetch user's currency preference

### Settings Integration

The formatting system integrates with the existing `SettingsContext`:

```typescript
const { settings } = useSettings();
const currency = settings?.currency || 'USD';
const calendar = settings?.calendar || 'gregorian';
const language = settings?.language || 'en';
```

### Fallback Behavior

If settings are unavailable (e.g., during loading), the system uses sensible defaults:
- Currency: USD
- Calendar: Gregorian
- Language: English

## Testing

Comprehensive tests are available in `tests/chat-formatters.test.ts`:

- Currency formatting for all supported currencies
- Timestamp formatting for various time ranges
- Language support for relative times
- Edge cases and fallback behavior

Run tests with:
```bash
npm test -- tests/chat-formatters.test.ts
```

## Future Enhancements

Potential improvements for future versions:

1. **Date Range Formatting**: Convert natural language date ranges to localized formats
   - "last month" → "November 2024" or "آبان ۱۴۰۳"
   - "last 5 months" → "June - October 2024"

2. **Number Localization**: Support different number formats for different locales
   - Persian numerals (۰۱۲۳۴۵۶۷۸۹) for Persian language
   - Different decimal/thousand separators

3. **Smart Currency Detection**: Better detection of currency amounts vs. other numbers
   - Avoid formatting version numbers, IDs, etc.
   - Context-aware formatting

4. **Streaming Support**: Format currency amounts in real-time as responses stream in
