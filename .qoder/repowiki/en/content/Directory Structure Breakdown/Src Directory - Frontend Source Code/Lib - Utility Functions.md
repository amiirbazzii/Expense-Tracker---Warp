# Lib - Utility Functions

<cite>
**Referenced Files in This Document**   
- [formatters.ts](file://src/lib/formatters.ts)
- [ExpenseCard.tsx](file://src/components/cards/ExpenseCard.tsx)
- [IncomeCard.tsx](file://src/components/cards/IncomeCard.tsx)
- [SummaryCards.tsx](file://src/features/dashboard/components/SummaryCards/SummaryCards.tsx)
- [CardBalances.tsx](file://src/features/dashboard/components/CardBalances/CardBalances.tsx)
- [CategoryList.tsx](file://src/features/dashboard/components/CategoryList/CategoryList.tsx)
- [DailySpendingChart.tsx](file://src/features/dashboard/components/Charts/DailySpendingChart.tsx)
- [CategoryBreakdownChart.tsx](file://src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx)
- [DateFilterHeader.tsx](file://src/components/DateFilterHeader.tsx)
- [SettingsContext.tsx](file://src/contexts/SettingsContext.tsx)
- [userSettings.ts](file://convex/userSettings.ts)
- [schema.ts](file://convex/schema.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Currency Formatting](#currency-formatting)
3. [Date Formatting](#date-formatting)
4. [Usage in Components](#usage-in-components)
5. [Extensibility and Localization](#extensibility-and-localization)
6. [Performance and Best Practices](#performance-and-best-practices)

## Introduction
The `formatters.ts` utility module in the `lib/` directory provides essential formatting functions for currency and date values across the expense tracking application. These utilities ensure consistent presentation of financial data while respecting user preferences stored in `SettingsContext`. The formatters are used throughout the application in components such as `ExpenseCard`, `IncomeCard`, and various dashboard elements to display transaction amounts and dates in a user-friendly format that adapts to locale-specific settings.

**Section sources**
- [formatters.ts](file://src/lib/formatters.ts#L1-L48)

## Currency Formatting
The `formatCurrency` function formats numeric amounts according to the user's selected currency, applying appropriate symbols and formatting rules. It retrieves currency preferences from `SettingsContext` and uses predefined currency symbols for supported currencies.

### Currency Symbols Mapping
The formatter supports four currencies with their respective symbols:
- **USD**: "$" (US Dollar)
- **EUR**: "€" (Euro)
- **GBP**: "£" (British Pound)
- **IRR**: "T" (Iranian Rial)

The function uses a `Record<Currency, string>` type to map currency codes to their display symbols.

### Formatting Logic
The function implements specific formatting rules:
- Uses `Intl.NumberFormat('en-US')` for standard numeric formatting with thousand separators
- Applies currency symbol positioning based on currency type:
  - Standard currencies (USD, EUR, GBP): Symbol precedes amount (e.g., "$1,234.56")
  - Iranian Rial (IRR): Symbol follows amount (e.g., "1,234.56 T")

```typescript
export const formatCurrency = (amount: number, currency: Currency) => {
  const symbol = currencySymbols[currency];
  const formattedAmount = new Intl.NumberFormat('en-US').format(amount);

  if (currency === "IRR") {
    return `${formattedAmount} ${symbol}`;
  }
  return `${symbol}${formattedAmount}`;
};
```

**Section sources**
- [formatters.ts](file://src/lib/formatters.ts#L7-L22)
- [schema.ts](file://convex/schema.ts#L48-L52)

## Date Formatting
The `formatDate` function provides calendar-aware date formatting, supporting both Gregorian and Jalali (Persian) calendars based on user settings.

### Calendar Support
The function supports two calendar systems:
- **Gregorian**: Standard international calendar
- **Jalali**: Persian calendar system used in Iran and other regions

### Token Conversion System
For Jalali calendar formatting, the function implements a token conversion system that translates `date-fns` format tokens to `jalali-moment` equivalents:

| date-fns Token | jalali-moment Token | Description |
|----------------|---------------------|-------------|
| yyyy | jYYYY | 4-digit year |
| MMMM | jMMMM | Full month name |
| MMM | jMMM | Abbreviated month name |
| MM | jMM | 2-digit month |
| dd | jDD | 2-digit day |
| d | jD | Day without leading zero |

The conversion process maintains proper token ordering to prevent conflicts during replacement.

```typescript
export const formatDate = (
  date: number | Date,
  calendar: Calendar,
  formatString = "yyyy/MM/dd",
) => {
  if (calendar === "jalali") {
    const jalaliFormat = convertToJalaliTokens(formatString);
    return moment(date).locale("fa").format(jalaliFormat);
  }
  return format(date, formatString);
};
```

**Section sources**
- [formatters.ts](file://src/lib/formatters.ts#L24-L47)
- [userSettings.ts](file://convex/userSettings.ts#L40-L44)

## Usage in Components
The formatting utilities are extensively used across various components to ensure consistent data presentation throughout the application.

### Expense and Income Cards
Both `ExpenseCard` and `IncomeCard` components use the formatters to display transaction details:

```mermaid
flowchart TD
A[Transaction Data] --> B{Settings Available?}
B --> |Yes| C[formatCurrency(amount, settings.currency)]
B --> |No| D[amount.toFixed(2)]
C --> E[Display Formatted Amount]
D --> E
F[Transaction Date] --> G{Settings Available?}
G --> |Yes| H[formatDate(date, settings.calendar)]
G --> |No| I[new Date(date).toLocaleDateString()]
H --> J[Display Formatted Date]
I --> J
```

**Diagram sources**
- [ExpenseCard.tsx](file://src/components/cards/ExpenseCard.tsx#L79-L82)
- [IncomeCard.tsx](file://src/components/cards/IncomeCard.tsx#L73-L74)

### Dashboard Components
Multiple dashboard components utilize the formatting functions for financial summaries and visualizations.

#### Summary Cards
The `SummaryCards` component uses `formatCurrency` to display total amounts:

```typescript
{settings ? formatCurrency(totalAmount, settings.currency) : `$${totalAmount.toFixed(2)}`}
```

#### Card Balances
The `CardBalances` component formats income, expenses, and balance values:

```typescript
{settings ? formatCurrency(card.totalIncome, settings.currency) : `$${card.totalIncome.toFixed(2)}`}
{settings ? formatCurrency(card.totalExpenses, settings.currency) : `$${card.totalExpenses.toFixed(2)}`}
{settings ? formatCurrency(card.balance, settings.currency) : `$${card.balance.toFixed(2)}`}
```

#### Category List
The `CategoryList` component formats category spending amounts:

```typescript
{settings ? formatCurrency(amount, settings.currency) : `$${amount.toFixed(2)}`}
```

#### Charts
Chart components use formatters for tooltip labels and axis formatting:

```typescript
// CategoryBreakdownChart
label += settings ? formatCurrency(value, settings.currency) : `$${value.toFixed(2)}`;

// DailySpendingChart
labels: Object.keys(dailyTotals).map(date => settings ? formatDate(new Date(date), settings.calendar, 'MMM d') : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
```

**Section sources**
- [SummaryCards.tsx](file://src/features/dashboard/components/SummaryCards/SummaryCards.tsx#L33)
- [CardBalances.tsx](file://src/features/dashboard/components/CardBalances/CardBalances.tsx#L81-L92)
- [CategoryList.tsx](file://src/features/dashboard/components/CategoryList/CategoryList.tsx#L30)
- [DailySpendingChart.tsx](file://src/features/dashboard/components/Charts/DailySpendingChart.tsx#L50-L65)
- [CategoryBreakdownChart.tsx](file://src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx#L69)

## Extensibility and Localization
The formatting system is designed with extensibility in mind, allowing for future enhancements to support additional currencies and localization features.

### Adding New Currencies
To add a new currency:
1. Update the `currencySymbols` object in `formatters.ts`
2. Add the currency to the `v.union` type in `userSettings.ts` and `schema.ts`
3. Implement any currency-specific formatting rules

### Calendar System Expansion
The token conversion system can be extended to support additional calendar systems by:
1. Adding new calendar types to the `Calendar` type
2. Implementing conversion logic for new calendar tokens
3. Updating the `formatDate` function to handle new calendar types

### Localization Considerations
Current localization features include:
- **Language**: Persian locale support for Jalali calendar
- **Regional Formatting**: US number formatting with thousand separators
- **Cultural Conventions**: IRR symbol positioning after amount

Future localization improvements could include:
- Multiple language support
- Region-specific number formatting
- Customizable date format patterns

**Section sources**
- [formatters.ts](file://src/lib/formatters.ts#L7-L47)
- [userSettings.ts](file://convex/userSettings.ts#L38-L44)
- [schema.ts](file://convex/schema.ts#L48-L56)

## Performance and Best Practices
The formatting utilities are designed with performance and best practices in mind for optimal application performance.

### Tree-Shaking Optimization
The functions are exported as named exports, enabling tree-shaking:
```typescript
export const formatCurrency = () => { /* ... */ }
export const formatDate = () => { /* ... */ }
```
This allows bundlers to eliminate unused formatting functions during build.

### Type Safety
The system maintains strong type safety through:
- TypeScript interfaces and types
- Convex schema validation
- Context typing with `SettingsContextType`

### Performance Considerations
Best practices implemented:
- **Memoization**: Format operations are pure functions suitable for memoization
- **Efficient Token Replacement**: Regular expressions with proper ordering
- **Minimal Dependencies**: Lightweight dependencies (`date-fns`, `jalali-moment`)

### Large Dataset Formatting
For performance with large datasets:
- Format values only when rendering (not during data processing)
- Consider memoizing frequently used format operations
- Use virtualized lists for long transaction lists

### Error Handling
The functions include implicit error handling:
- `Intl.NumberFormat` handles invalid numbers
- `date-fns` and `jalali-moment` handle invalid dates
- Optional chaining with settings prevents null reference errors

**Section sources**
- [formatters.ts](file://src/lib/formatters.ts#L1-L48)
- [SettingsContext.tsx](file://src/contexts/SettingsContext.tsx#L8-L9)