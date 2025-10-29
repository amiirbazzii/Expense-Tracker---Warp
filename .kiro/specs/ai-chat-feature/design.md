# Design Document

## Overview

The AI Chat feature provides users with a conversational interface to query their financial data. The system uses OpenRouter's API to interpret natural language questions and returns concise, numeric answers computed from the user's actual transaction data. The chat maintains a single persistent thread across sessions, ensuring continuity and context.

### Key Design Principles

1. **Data Privacy**: Raw transaction data never leaves the server; only aggregated summaries are used for AI context
2. **Accuracy First**: All numeric calculations are performed server-side using existing data access patterns
3. **Minimal Latency**: Instant UI feedback with optimistic updates and loading states
4. **Offline Resilience**: Chat history persists locally; graceful degradation when offline
5. **Single Thread**: One continuous conversation per user, no chat management overhead

## Architecture

### High-Level Flow

```
User Input → Frontend Validation → API Route → Data Aggregation → OpenRouter → Response Formatting → UI Update → Persist History
```

### Component Hierarchy

```
/chat (Page)
├── ChatHeader
├── MessageList
│   ├── MessageBubble (User)
│   ├── MessageBubble (Assistant)
│   └── TypingIndicator
├── SuggestedPrompts (Empty State)
└── ChatInput
    ├── TextArea
    └── SendButton
```

## Components and Interfaces

### Frontend Components

#### 1. ChatPage (`src/app/chat/page.tsx`)

Main page component that orchestrates the chat interface.

**State:**
- `messages: Message[]` - Current chat history
- `isLoading: boolean` - API call in progress
- `inputValue: string` - Current input text
- `error: string | null` - Error message if any

**Responsibilities:**
- Load message history from localStorage on mount
- Handle message submission
- Manage loading and error states
- Persist messages to localStorage after each update

#### 2. MessageList (`src/components/chat/MessageList.tsx`)

Displays the conversation history with auto-scroll to bottom.

**Props:**
```typescript
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}
```

**Features:**
- Auto-scroll to latest message
- Timestamp display (relative for recent, absolute for older)
- Differentiated styling for user vs assistant messages
- Loading indicator at bottom when waiting for response

#### 3. MessageBubble (`src/components/chat/MessageBubble.tsx`)

Individual message display component.

**Props:**
```typescript
interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}
```

**Styling:**
- User messages: Right-aligned, gray background
- Assistant messages: Left-aligned, white background with border
- Timestamps: Small, muted text below message
- Currency formatting for numeric values

#### 4. ChatInput (`src/components/chat/ChatInput.tsx`)

Text input with send button.

**Props:**
```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}
```

**Features:**
- Auto-resize textarea (max 4 lines)
- Enter to send, Shift+Enter for new line
- Disabled state during API calls
- Character limit (500 chars)

#### 5. SuggestedPrompts (`src/components/chat/SuggestedPrompts.tsx`)

Empty state with clickable prompt suggestions.

**Props:**
```typescript
interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}
```

**Prompts:**
1. "How much did I spend on coffee last month?"
2. "Did I spend more on investments or coffee in the last 5 months?"
3. "Top 3 categories last quarter"

### Backend API

#### API Route: `/api/chat` (POST)

**Request Body:**
```typescript
interface ChatRequest {
  message: string;
  conversationHistory: Message[];
  token: string; // Auth token
}
```

**Response:**
```typescript
interface ChatResponse {
  message: string;
  timestamp: number;
  requiresClarification?: boolean;
}
```

**Error Response:**
```typescript
interface ChatError {
  error: string;
  code: 'API_ERROR' | 'NO_DATA' | 'AUTH_ERROR' | 'VALIDATION_ERROR';
}
```

#### Data Aggregation Service (`src/lib/chat/dataAggregator.ts`)

Responsible for computing financial data based on user queries.

**Key Functions:**

```typescript
interface DataAggregator {
  // Get spending by category for a date range
  getCategorySpending(
    userId: string,
    categories: string[],
    startDate: number,
    endDate: number
  ): Promise<CategorySpending[]>;

  // Get total spending for a date range
  getTotalSpending(
    userId: string,
    startDate: number,
    endDate: number
  ): Promise<number>;

  // Get top N categories by spending
  getTopCategories(
    userId: string,
    startDate: number,
    endDate: number,
    limit: number
  ): Promise<CategorySpending[]>;

  // Compare spending between categories
  compareCategories(
    userId: string,
    categories: string[],
    startDate: number,
    endDate: number
  ): Promise<CategoryComparison>;
}
```

**Integration with Existing Code:**
- Uses Convex queries similar to `getExpensesByDateRange`
- Leverages existing date utilities from `useTimeFramedData`
- Follows authentication patterns from `AuthContext`

#### Query Interpreter (`src/lib/chat/queryInterpreter.ts`)

Parses user intent and extracts parameters.

**Key Functions:**

```typescript
interface QueryInterpreter {
  // Parse user message and extract intent
  parseQuery(message: string): ParsedQuery;

  // Resolve natural language dates
  resolveDateRange(phrase: string): DateRange;

  // Extract categories from message
  extractCategories(message: string, availableCategories: string[]): string[];
}

interface ParsedQuery {
  intent: 'total_spending' | 'category_spending' | 'comparison' | 'top_categories' | 'unclear';
  categories: string[];
  dateRange: DateRange;
  limit?: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

interface DateRange {
  start: number;
  end: number;
  description: string; // e.g., "last month", "Q1 2024"
}
```

**Date Resolution Examples:**
- "last month" → Previous calendar month
- "this month" → Current month to date
- "last 5 months" → 5 months back from today
- "last quarter" → Previous 3-month period
- "YTD" → Year to date

Uses existing date logic from `useTimeFramedData` and settings context for Jalali calendar support.

#### OpenRouter Integration (`src/lib/chat/openRouterClient.ts`)

Handles communication with OpenRouter API.

**Configuration:**
```typescript
interface OpenRouterConfig {
  apiKey: string; // From OPENROUTER_API_KEY env var
  model: string; // From OPENROUTER_MODEL env var, default: "openai/gpt-3.5-turbo"
  maxTokens: number; // 500 (keep responses concise)
  temperature: number; // 0.3 (more deterministic)
}
```

**Key Function:**
```typescript
async function generateResponse(
  userMessage: string,
  context: AggregatedData,
  conversationHistory: Message[]
): Promise<string>
```

**System Prompt:**
```
You are a financial assistant helping users understand their spending data.
You provide concise, numeric answers based on the data provided.
Always include currency amounts and date ranges in your responses.
If the data shows no results, inform the user clearly.
Keep responses under 3 sentences.
```

**Context Format:**
```typescript
interface AggregatedData {
  query: string;
  dateRange: string;
  results: {
    totalSpending?: number;
    categoryBreakdown?: { category: string; amount: number }[];
    comparison?: { category: string; amount: number }[];
  };
  currency: string;
}
```

## Data Models

### Message Model

```typescript
interface Message {
  id: string; // UUID
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    requiresClarification?: boolean;
    dataQuery?: ParsedQuery;
  };
}
```

### Chat History Storage

**LocalStorage Key:** `chat-history-${userId}`

**Structure:**
```typescript
interface ChatHistory {
  userId: string;
  messages: Message[];
  lastUpdated: number;
}
```

**Persistence Strategy:**
- Save after each message exchange
- Load on page mount
- Clear on logout
- Max 100 messages (trim oldest if exceeded)

## Error Handling

### Error Types and Messages

1. **API Connection Error**
   - Display: "I'm having trouble right now. Please try again."
   - Action: Show "Try again" button
   - Behavior: Retry last user message

2. **No Data Found**
   - Display: "I couldn't find transactions for that request. Try another timeframe or category."
   - Action: Allow user to rephrase
   - Behavior: Keep message in history

3. **Authentication Error**
   - Display: "Your session has expired. Please log in again."
   - Action: Redirect to login
   - Behavior: Preserve chat history for after login

4. **Rate Limit Error**
   - Display: "Too many requests. Please wait a moment and try again."
   - Action: Show "Try again" button with 5-second cooldown
   - Behavior: Disable input temporarily

### Error Recovery

```typescript
interface ErrorState {
  message: string;
  code: string;
  retryable: boolean;
  retryAction?: () => void;
}
```

**Error Boundary:**
- Wrap ChatPage in ErrorBoundary component
- Fallback UI with option to reload or go back
- Log errors to console for debugging

## Testing Strategy

### Unit Tests

1. **Query Interpreter Tests** (`queryInterpreter.test.ts`)
   - Date range parsing accuracy
   - Category extraction
   - Intent classification
   - Clarification detection

2. **Data Aggregator Tests** (`dataAggregator.test.ts`)
   - Correct calculation of totals
   - Category filtering
   - Date range filtering
   - Top N selection

3. **Component Tests**
   - MessageBubble rendering
   - ChatInput validation
   - SuggestedPrompts interaction
   - Message list auto-scroll

### Integration Tests

1. **API Route Tests** (`/api/chat.test.ts`)
   - Request validation
   - Authentication flow
   - Error responses
   - Response formatting

2. **End-to-End Flow**
   - Send message → receive response
   - Clarification flow
   - Error handling
   - History persistence

### Manual Testing Checklist

- [ ] Empty state shows suggested prompts
- [ ] Clicking prompt populates input
- [ ] Message submission shows loading state
- [ ] Response appears with timestamp
- [ ] History persists after refresh
- [ ] Offline mode shows appropriate message
- [ ] Error states display correctly
- [ ] "Try again" button works
- [ ] Chat clears on logout
- [ ] Mobile responsive layout
- [ ] Jalali calendar dates work correctly

## Security Considerations

### Data Privacy

1. **No Raw Data Transmission**
   - Only aggregated summaries sent to OpenRouter
   - Transaction details remain server-side
   - User IDs never included in AI context

2. **Authentication**
   - All API routes require valid auth token
   - Token validation on every request
   - User data isolation enforced

3. **API Key Protection**
   - OPENROUTER_API_KEY stored in server env only
   - Never exposed to client-side code
   - Rotation strategy documented

### Input Validation

```typescript
// Server-side validation
function validateChatRequest(req: ChatRequest): ValidationResult {
  if (!req.message || req.message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (req.message.length > 500) {
    return { valid: false, error: 'Message too long' };
  }
  if (!req.token) {
    return { valid: false, error: 'Authentication required' };
  }
  return { valid: true };
}
```

## Performance Optimization

### Caching Strategy

1. **User Categories Cache**
   - Cache available categories per user
   - Refresh on new category creation
   - TTL: 5 minutes

2. **Recent Queries Cache**
   - Cache aggregated results for common queries
   - Key: `${userId}-${queryHash}`
   - TTL: 1 minute

### Response Time Targets

- Message submission to loading state: < 50ms
- API response time: < 2 seconds (p95)
- OpenRouter call timeout: 10 seconds
- UI update after response: < 100ms

### Optimization Techniques

1. **Debounced Input**: Prevent rapid submissions
2. **Optimistic UI**: Show user message immediately
3. **Lazy Loading**: Load chat history incrementally if > 50 messages
4. **Request Cancellation**: Cancel pending requests on new submission

## Accessibility

### ARIA Labels

```typescript
<div role="log" aria-live="polite" aria-label="Chat messages">
  {/* Message list */}
</div>

<textarea
  aria-label="Type your question"
  aria-describedby="char-count"
/>

<button
  aria-label="Send message"
  disabled={isLoading}
/>
```

### Keyboard Navigation

- Tab through input and send button
- Enter to send (Shift+Enter for new line)
- Escape to clear input
- Screen reader announcements for new messages

## Internationalization

### RTL Support

- Detect language from settings context
- Apply RTL layout for Persian/Arabic
- Mirror message bubble alignment
- Adjust timestamp positioning

### Date Formatting

- Use Jalali calendar when `settings.calendar === 'jalali'`
- Format dates according to locale
- Consistent with existing date utilities

## Migration and Rollout

### Phase 1: Core Implementation
- Basic chat UI with message history
- API route with simple query handling
- OpenRouter integration
- Local storage persistence

### Phase 2: Enhanced Features
- Clarification questions
- Advanced date parsing
- Category comparison
- Error recovery

### Phase 3: Optimization
- Response caching
- Performance monitoring
- A/B testing different prompts
- Analytics integration

### Rollout Strategy

1. **Internal Testing**: Team members only
2. **Beta Release**: 10% of users
3. **Gradual Rollout**: Increase to 50%, then 100%
4. **Monitoring**: Track error rates, response times, user engagement

## Monitoring and Analytics

### Key Metrics

1. **Usage Metrics**
   - Messages sent per user
   - Average session length
   - Suggested prompt click rate
   - Retry rate

2. **Performance Metrics**
   - API response time (p50, p95, p99)
   - OpenRouter latency
   - Error rate by type
   - Cache hit rate

3. **Quality Metrics**
   - Clarification question rate
   - "No data" response rate
   - User satisfaction (future: thumbs up/down)

### Logging

```typescript
// Server-side logging
logger.info('Chat query processed', {
  userId: user._id,
  intent: parsedQuery.intent,
  dateRange: parsedQuery.dateRange,
  responseTime: duration,
  cached: fromCache,
});

logger.error('OpenRouter API error', {
  userId: user._id,
  error: error.message,
  statusCode: error.statusCode,
});
```

## Future Enhancements (Out of Scope for v1)

- Streaming responses for longer answers
- Voice input support
- Export chat history
- Suggested follow-up questions
- Multi-turn clarification dialogs
- Chart/graph generation in responses
- Budget recommendations
- Spending alerts via chat
- Multiple chat threads
- Chat search functionality
