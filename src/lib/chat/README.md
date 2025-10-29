# Chat Backend Infrastructure

This directory contains the backend infrastructure and utilities for the AI Chat feature.

## Components

### 1. Date Utils (`dateUtils.ts`)
Handles natural language date parsing and resolution.

**Features:**
- Supports both Gregorian and Jalali calendars
- Parses phrases like "last month", "last 5 months", "YTD", etc.
- Returns timestamp ranges for queries

**Example:**
```typescript
import { resolveDateRange } from './dateUtils';

const range = resolveDateRange('last month', false);
// Returns: { start: 1234567890, end: 1234567890, description: "October 2024" }
```

### 2. Query Interpreter (`queryInterpreter.ts`)
Parses user messages to extract intent, categories, and timeframes.

**Features:**
- Rule-based intent detection
- Category extraction from natural language
- Clarification detection when information is missing

**Example:**
```typescript
import { interpretQuery } from './queryInterpreter';

const intent = interpretQuery('How much did I spend on coffee last month?');
// Returns: { type: 'category_spending', categories: ['Coffee'], timeframe: 'last month' }
```

### 3. Data Aggregator (`dataAggregator.ts`)
Computes financial summaries from user's transaction data.

**Features:**
- Category spending aggregation
- Total spending calculation
- Top categories ranking
- Category comparison

**Example:**
```typescript
import { DataAggregator } from './dataAggregator';

const aggregator = new DataAggregator(process.env.NEXT_PUBLIC_CONVEX_URL!);
const spending = await aggregator.getCategorySpending(
  token,
  ['Coffee', 'Restaurant'],
  startDate,
  endDate
);
```

### 4. OpenRouter Client (`openRouterClient.ts`)
Handles communication with OpenRouter API for AI responses.

**Features:**
- Function calling support
- Configurable model selection
- System prompt management
- Error handling

**Example:**
```typescript
import { createOpenRouterClient, OpenRouterClient } from './openRouterClient';

const client = createOpenRouterClient();
const response = await client.createChatCompletion(
  messages,
  OpenRouterClient.getFunctionDefinitions()
);
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# Required: OpenRouter API key
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: Model selection (defaults to free model)
OPENROUTER_MODEL=google/gemini-flash-1.5-8b

# Required: App URL for OpenRouter
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Free Model Options

The following models are completely free on OpenRouter and support function calling:

- `google/gemini-flash-1.5-8b` (recommended default)
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

## Usage in API Routes

```typescript
import { 
  resolveDateRange, 
  interpretQuery, 
  DataAggregator,
  createOpenRouterClient,
  OpenRouterClient
} from '@/lib/chat';

// In your API route handler
const intent = interpretQuery(userMessage);
const dateRange = resolveDateRange(intent.timeframe || 'this month', useJalali);
const aggregator = new DataAggregator(process.env.NEXT_PUBLIC_CONVEX_URL!);
const data = await aggregator.getCategorySpending(
  token,
  intent.categories || [],
  dateRange.start,
  dateRange.end
);
```

## Testing

The utilities can be tested independently:

```typescript
// Test date resolution
const range = resolveDateRange('last 5 months', false);
console.log(range);

// Test query interpretation
const intent = interpretQuery('Compare coffee and restaurant spending last month');
console.log(intent);
```

## Security Notes

- All API keys are server-side only (never exposed to client)
- User authentication is enforced via token validation
- Raw transaction data never leaves the server
- Only aggregated summaries are used for AI context
