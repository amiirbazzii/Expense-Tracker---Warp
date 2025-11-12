# Design Document

## Overview

The AI Chat feature provides users with a conversational interface to query their financial data. The system uses OpenRouter's API to interpret natural language questions and returns concise, numeric answers computed from the user's actual transaction data. The chat maintains a single persistent thread across sessions, ensuring continuity and context.

### Key Design Principles

1. **Data Privacy**: Raw transaction data never leaves the server; only aggregated summaries are used for AI context
2. **Accuracy First**: All numeric calculations are performed server-side using function calling with existing data access patterns
3. **Minimal Latency**: Instant UI feedback with optimistic updates and loading states
4. **Persistent History**: Chat messages stored server-side in database for cross-device access
5. **Single Thread**: One continuous conversation per user, no chat management overhead

## Architecture

### High-Level Flow

```
User Input → Frontend Validation → API Route → Function Calling → Data Aggregation → OpenRouter → Response Formatting → UI Update → Persist to Database
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
- Load message history from database on mount
- Handle message submission
- Manage loading and error states
- Optimistically update UI while persisting to database

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

Responsible for computing financial data based on function calls from OpenRouter.

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

#### OpenRouter Integration (`src/lib/chat/openRouterClient.ts`)

Handles communication with OpenRouter API using function calling.

**Configuration:**
```typescript
interface OpenRouterConfig {
  apiKey: string; // From OPENROUTER_API_KEY env var
  model: string; // From OPENROUTER_MODEL env var, default: "google/gemini-flash-1.5-8b"
  maxTokens: number; // 500 (keep responses concise)
  temperature: number; // 0.3 (more deterministic)
}
```

**Function Definitions:**

The following tools are provided to OpenRouter for function calling:

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "get_category_spending",
      description: "Get total spending for specific categories in a date range",
      parameters: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Category names (e.g., ['coffee', 'restaurant'])"
          },
          timeframe: {
            type: "string",
            description: "Natural language timeframe (e.g., 'last month', 'last 5 months')"
          }
        },
        required: ["categories", "timeframe"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_total_spending",
      description: "Get total spending across all categories for a date range",
      parameters: {
        type: "object",
        properties: {
          timeframe: {
            type: "string",
            description: "Natural language timeframe"
          }
        },
        required: ["timeframe"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_categories",
      description: "Compare spending between two or more categories",
      parameters: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: { type: "string" },
            minItems: 2
          },
          timeframe: { type: "string" }
        },
        required: ["categories", "timeframe"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_categories",
      description: "Get top N spending categories",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of top categories to return"
          },
          timeframe: { type: "string" }
        },
        required: ["limit", "timeframe"]
      }
    }
  }
];
```

**Function Calling Flow:**

```typescript
async function processWithFunctionCalling(
  userMessage: string,
  userId: string,
  conversationHistory: Message[]
): Promise<string> {
  // 1. Send message to OpenRouter with tools
  const initialResponse = await openrouter.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ],
    tools,
    tool_choice: "auto"
  });

  // 2. If function call requested, execute it
  if (initialResponse.choices[0].message.tool_calls) {
    const toolCall = initialResponse.choices[0].message.tool_calls[0];
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    // 3. Execute the function server-side with user data
    const functionResult = await executeFunction(functionName, args, userId);

    // 4. Send function result back to OpenRouter for natural language response
    const finalResponse = await openrouter.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage },
        initialResponse.choices[0].message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        }
      ]
    });

    return finalResponse.choices[0].message.content;
  }

  // 5. Direct response if no function needed
  return initialResponse.choices[0].message.content;
}
```

**System Prompt:**
```
You are a financial assistant helping users understand their spending data.
Use the provided functions to query accurate data. Never estimate or guess numbers.
Provide concise answers (2-3 sentences) that include:
- Specific currency amounts
- Date ranges queried
- Clear comparisons when relevant

If a question is ambiguous, ask ONE clarifying question before calling functions.
```

**Date Resolution Helper:**

```typescript
function resolveDateRange(timeframe: string): { start: number; end: number } {
  // Uses existing date utilities from the project
  // Examples:
  // "last month" → Previous calendar month
  // "last 5 months" → 5 months back from today
  // "last quarter" → Previous 3-month period
  // "YTD" → Year to date
  // "this month" → Current month to date
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
  userId: string; // Foreign key to user
  metadata?: {
    requiresClarification?: boolean;
    functionCalled?: string;
    functionResult?: any;
  };
}
```

### Chat History Storage

**Database Schema (using existing data layer - Convex):**

```typescript
// Define in convex/schema.ts
messages: defineTable({
  userId: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
  metadata: v.optional(v.object({
    requiresClarification: v.optional(v.boolean()),
    functionCalled: v.optional(v.string()),
    functionResult: v.optional(v.any())
  }))
})
  .index("by_user", ["userId", "timestamp"])
```

**Persistence Strategy:**
- Store all messages in database immediately after creation
- Load on page mount via Convex query
- Clear on user request or logout
- No arbitrary message limit (database handles storage)

**Query Pattern:**
```typescript
// In convex/messages.ts
export const getChatHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx); // Existing auth helper
    return await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  }
});

export const addMessage = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("messages", {
      userId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      metadata: args.metadata
    });
  }
});
```

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

## Security Considerations

### Data Privacy

1. **No Raw Data Transmission**
   - Only function results (aggregated summaries) sent to OpenRouter
   - Transaction details remain server-side
   - User IDs never included in AI context

2. **Authentication**
   - All API routes require valid auth token
   - Token validation on every request
   - User data isolation enforced via Convex auth helpers

3. **API Key Protection**
   - OPENROUTER_API_KEY stored in server env only
   - Never exposed to client-side code
   - Rotation strategy documented in deployment docs

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

### Response Time Targets

- Message submission to loading state: < 50ms
- API response time: < 3 seconds (p95)
- OpenRouter call timeout: 10 seconds
- UI update after response: < 100ms
- Database query time: < 200ms

### Optimization Techniques

1. **Optimistic UI**: Show user message immediately
2. **Request Cancellation**: Cancel pending requests on new submission
3. **Convex Reactivity**: Leverage real-time updates for message history

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
- Format dates according to locale using existing date utilities
- Consistent with existing date display patterns

## Testing Strategy

### Manual Testing Checklist

- [ ] Empty state shows suggested prompts
- [ ] Clicking prompt populates input
- [ ] Message submission shows loading state
- [ ] Response appears with timestamp
- [ ] History persists after refresh
- [ ] History syncs across devices
- [ ] Offline mode shows appropriate message
- [ ] Error states display correctly
- [ ] "Try again" button works
- [ ] Chat history persists after logout/login
- [ ] Mobile responsive layout
- [ ] Jalali calendar dates work correctly
- [ ] Function calling executes correctly for each tool
- [ ] Clarification questions work as expected

### Test Scenarios

1. **Basic Queries**
   - "How much did I spend on coffee last month?" → Correct total
   - "What did I spend this month?" → Current month total
   - "Total spending last quarter" → Correct quarter calculation

2. **Comparisons**
   - "Did I spend more on X or Y?" → Correct comparison
   - "Compare last month vs this month" → Accurate comparison

3. **Top Categories**
   - "Top 5 categories last month" → Correct ranking
   - "Biggest expense this year" → Accurate result

4. **Edge Cases**
   - No transactions in timeframe → Helpful message
   - Ambiguous category name → Clarification question
   - Very long message → Validation error
   - Offline → Appropriate error message

## Monitoring and Observability

### Key Metrics (v1 - Simple)

1. **Usage**
   - Messages sent per user per day
   - Suggested prompt click rate

2. **Performance**
   - API response time average
   - Error rate by type

3. **Quality**
   - Clarification question rate
   - "No data" response rate

### Logging

```typescript
// Server-side logging (simple console logs for v1)
console.log('Chat query processed', {
  userId: user._id,
  functionCalled: functionName,
  responseTime: duration,
});

console.error('OpenRouter API error', {
  userId: user._id,
  error: error.message,
  statusCode: error.statusCode,
});
```

## Implementation Notes

### Integration Points

1. **Existing Convex Schema**: Add `messages` table
2. **Existing Auth**: Use current auth context and helpers
3. **Existing Date Utils**: Use `useTimeFramedData` date resolution logic
4. **Existing Transaction Queries**: Leverage for function implementations
5. **Existing Settings**: Respect calendar type (Jalali/Gregorian) and locale

### Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-flash-1.5-8b  # Free default
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Free Model Options (for OPENROUTER_MODEL)

- `google/gemini-flash-1.5-8b` (recommended default)
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

All support function calling and are completely free on OpenRouter.

## Future Enhancements (Out of Scope for v1)

- Streaming responses for real-time typing effect
- Voice input support
- Export chat history
- Suggested follow-up questions
- Chart/graph generation in responses
- Budget recommendations via chat
- Spending alerts
- Message search functionality
- Clear chat history option in UI

---