# AI Financial Chat - Design Document

## Overview

The AI Financial Chat feature provides users with a conversational interface to query and analyze their financial data using natural language. The system leverages OpenRouter API to connect to various AI language models, enabling users to ask questions like "How much did I spend on groceries this month?" or "What's my biggest expense category?" and receive accurate, data-driven responses based on their actual transaction history.

### Key Design Principles

1. **Data Accuracy**: All responses must be grounded in the user's actual transaction data from the Convex database
2. **Privacy First**: API keys remain server-side only; user data never leaves the secure backend context
3. **Seamless Integration**: Follow existing application patterns for authentication, styling, and data management
4. **Performance**: Optimize for fast response times even with large transaction datasets (up to 5,000 transactions)
5. **User Experience**: Provide clear feedback, helpful suggestions, and graceful error handling

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Chat Page     │
│   (Frontend)    │
└────────┬────────┘
         │
         │ useQuery/useMutation
         │
┌────────▼────────┐
│  Convex API     │
│  chat.ts        │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
┌────────▼────────┐ ┌──▼──────────────┐
│  Messages DB    │ │  OpenRouter API │
│  (Convex)       │ │  (External)     │
└─────────────────┘ └─────────────────┘
```

### Data Flow

1. **User Input**: User types a question in the chat interface
2. **Message Persistence**: User message is saved to Convex `messages` table
3. **Context Gathering**: Backend retrieves user's transactions and recent conversation history
4. **AI Request**: System constructs prompt with transaction data and sends to OpenRouter
5. **Response Processing**: AI response is received and saved to `messages` table
6. **UI Update**: Frontend displays the AI response in the chat interface

### Technology Stack Integration

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Convex (serverless functions and database)
- **AI Service**: OpenRouter API (configurable model selection)
- **State Management**: Convex real-time queries and mutations
- **Authentication**: Existing token-based auth system via AuthContext
- **Styling**: Tailwind CSS with existing design system patterns

## Components and Interfaces

### Frontend Components

#### 1. Chat Page (`/src/app/chat/page.tsx`)

**Purpose**: Main chat interface container

**Key Features**:
- Protected route (requires authentication)
- Responsive layout with mobile-first design
- Auto-scroll to latest message
- Empty state with suggested prompts
- Loading states during AI processing

**Component Structure**:
```tsx
ChatPage
├── AppHeader (existing component)
├── ChatContainer
│   ├── EmptyState (conditional)
│   │   └── SuggestedPrompts
│   ├── MessageList
│   │   └── MessageBubble (user/assistant)
│   └── LoadingIndicator (conditional)
├── ChatInput
│   ├── Textarea (multi-line)
│   ├── CharacterCounter
│   └── SendButton
└── BottomNav (existing component)
```

**State Management**:
- Messages: Retrieved via `useQuery(api.chat.getMessages)`
- Input text: Local state with character limit validation
- Loading state: Tracks pending AI response
- Auto-scroll: Ref-based scroll management

#### 2. MessageBubble Component

**Purpose**: Display individual chat messages

**Props**:
```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isLatest?: boolean;
}
```

**Styling**:
- User messages: Right-aligned, blue background (#3B82F6)
- Assistant messages: Left-aligned, gray background (#F3F4F6)
- Max width: 80% of container
- Rounded corners: 16px
- Padding: 12px 16px
- Timestamp: Below message, small gray text

#### 3. ChatInput Component

**Purpose**: Text input with send functionality

**Features**:
- Multi-line textarea (max 4 visible lines)
- 500 character limit with counter
- Enter to send, Shift+Enter for new line
- Disabled state during AI processing
- Auto-focus on mount
- Clear input after send

**Validation**:
- Disable send button when empty or whitespace-only
- Show character count when approaching limit (>400 chars)

#### 4. EmptyState Component

**Purpose**: Welcome screen for first-time users

**Content**:
- Welcome message: "Ask me anything about your finances"
- Subtitle: "I can help you analyze your spending, income, and financial trends"
- Three suggested prompts:
  1. "How much did I spend this month?"
  2. "What's my biggest expense category?"
  3. "Show me my income vs expenses"

**Behavior**:
- Clicking a prompt populates the input field
- User can edit before sending
- Hidden once first message is sent

### Backend Components

#### 1. Convex Schema Extension

**New Table: `messages`**

```typescript
messages: defineTable({
  userId: v.id("users"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
  createdAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_user_timestamp", ["userId", "timestamp"])
```

**Rationale**: 
- Separate table for chat messages to maintain clean separation from transaction data
- Indexed by user for efficient retrieval
- Timestamp index for chronological ordering
- Role field distinguishes user questions from AI responses

#### 2. Convex Chat API (`convex/chat.ts`)

**Query: `getMessages`**

```typescript
export const getMessages = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    // 2. Query messages by userId
    // 3. Return ordered by timestamp (ascending)
  }
});
```

**Mutation: `sendMessage`**

```typescript
export const sendMessage = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    // 2. Save user message to DB
    // 3. Retrieve user's transactions
    // 4. Get last 10 messages for context
    // 5. Call OpenRouter API
    // 6. Save AI response to DB
    // 7. Return response
  }
});
```

**Mutation: `retryLastMessage`**

```typescript
export const retryLastMessage = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    // 2. Get last user message
    // 3. Re-execute AI request
    // 4. Save new response
  }
});
```

#### 3. OpenRouter Integration

**API Configuration**:
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Authentication: Bearer token from `OPENROUTER_API_KEY` env variable
- Model: Configurable via `OPENROUTER_MODEL` env variable
- Default model: `openai/gpt-4.1-nano` (free tier, large context window)

**Request Structure**:
```typescript
{
  model: process.env.OPENROUTER_MODEL,
  messages: [
    {
      role: "system",
      content: `You are a financial assistant. Today is ${formattedDate}.
                User's transactions: ${JSON.stringify(transactions)}
                Analyze the data and provide concise answers (2-3 sentences).`
    },
    ...conversationHistory, // Last 10 messages
    {
      role: "user",
      content: userQuestion
    }
  ]
}
```

**Response Handling**:
- Extract AI message from response
- Handle rate limits and errors gracefully
- Timeout after 30 seconds
- Retry logic for transient failures

## Data Models

### Message Model

```typescript
interface Message {
  _id: Id<"messages">;
  userId: Id<"users">;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  createdAt: number;
}
```

### Transaction Context Model

```typescript
interface TransactionContext {
  expenses: Array<{
    date: number;
    category: string[];
    amount: number;
    title: string;
    for: string[];
  }>;
  income: Array<{
    date: number;
    category: string;
    amount: number;
    source: string;
  }>;
  cards: Array<{
    name: string;
    balance?: number;
  }>;
}
```

### OpenRouter Request Model

```typescript
interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
  }>;
}
```

## Error Handling

### Frontend Error Handling

**Network Errors**:
- Display: "I'm having trouble right now. Please try again."
- Action: Show "Try Again" button
- Behavior: Retry button calls `retryLastMessage` mutation

**Authentication Errors**:
- Redirect to login page
- Preserve chat state in session storage for return

**Validation Errors**:
- Character limit: Show warning at 450 chars, prevent send at 500
- Empty message: Disable send button

### Backend Error Handling

**OpenRouter API Errors**:
- Rate limit (429): Return user-friendly message with retry suggestion
- Timeout: Return "Request took too long, please try again"
- Invalid API key: Log error, return generic error message
- Model unavailable: Fallback to alternative model if configured

**Database Errors**:
- Transaction retrieval failure: Return error, don't proceed with AI request
- Message save failure: Log error, return to user

**Authentication Errors**:
- Invalid token: Throw ConvexError("Authentication required")
- Missing user: Throw ConvexError("User not found")

### Error Response Format

```typescript
interface ErrorResponse {
  error: true;
  message: string;
  retryable: boolean;
}
```

## Testing Strategy

### Unit Tests

**Frontend Components**:
- MessageBubble: Rendering with different roles and content
- ChatInput: Character limit, Enter/Shift+Enter behavior, validation
- EmptyState: Suggested prompt click behavior

**Backend Functions**:
- Message persistence: Verify correct data structure
- Transaction retrieval: Test with various user scenarios
- OpenRouter request construction: Validate prompt format

### Integration Tests

**End-to-End Flow**:
1. User sends message → Message appears in UI
2. AI response received → Response appears in UI
3. Conversation context → Follow-up questions work correctly
4. Error scenarios → Proper error messages displayed

**Performance Tests**:
- Large dataset: Test with 5,000 transactions
- Response time: Measure 95th percentile latency
- Concurrent users: Test multiple simultaneous conversations

### Manual Testing Scenarios

1. **First-time user**: Empty state displays, suggested prompts work
2. **Basic questions**: "How much did I spend?" returns accurate data
3. **Follow-up questions**: Context is maintained across messages
4. **No transactions**: AI responds appropriately
5. **Error recovery**: Try Again button works after failure
6. **Mobile experience**: Layout responsive, keyboard behavior correct

## Security Considerations

### API Key Protection

**Design Decision**: Store OpenRouter API key in environment variables, never expose to frontend

**Implementation**:
- API key accessed only in Convex backend functions
- No API key in client-side code or network requests
- Environment variable validation on deployment

### Data Privacy

**User Data Isolation**:
- All queries filtered by authenticated userId
- Token validation on every request
- No cross-user data leakage

**Input Sanitization**:
- Escape special characters in user input
- Limit message length to prevent abuse
- Validate message content before processing

### Rate Limiting

**Design Decision**: Implement per-user rate limiting to prevent abuse

**Implementation**:
- Track message count per user per hour
- Limit: 50 messages per hour per user
- Return error when limit exceeded with reset time

## Performance Optimization

### Frontend Optimizations

**Lazy Loading**:
- Load chat page components on demand
- Defer non-critical UI elements

**Message Virtualization**:
- For conversations >100 messages, implement virtual scrolling
- Load messages in batches (50 at a time)

**Debouncing**:
- Debounce character counter updates
- Throttle scroll event handlers

### Backend Optimizations

**Transaction Data Optimization**:
- Limit transaction data to last 12 months by default
- Compress transaction data in prompt (remove unnecessary fields)
- Cache transaction summaries for repeated queries

**Conversation Context Management**:
- Limit context to last 10 messages (configurable)
- Prune old messages from context to reduce token usage

**OpenRouter Request Optimization**:
- Use streaming responses for faster perceived performance (future enhancement)
- Implement request caching for identical questions (future enhancement)

## Styling and Design System Integration

### Color Palette

Following existing design system:
- Primary: #3B82F6 (blue-500)
- Background: #FFFFFF (white)
- Secondary background: #F9F9F9
- Border: #E5E7EB (gray-200)
- Text primary: #171717
- Text secondary: #6B7280 (gray-500)

### Typography

- Message content: 14px, line-height 1.5
- Timestamp: 12px, gray-500
- Input: 16px (prevents zoom on iOS)
- Empty state title: 20px, font-semibold

### Spacing

- Container padding: 16px
- Message margin: 12px vertical
- Input padding: 12px
- Button padding: 12px 24px

### Responsive Design

**Mobile (< 768px)**:
- Full-width layout
- Bottom navigation visible
- Input fixed to bottom
- Messages scroll in middle section

**Desktop (≥ 768px)**:
- Max width: 768px, centered
- Side navigation (if implemented)
- Larger text sizes for readability

### Animations

- Message appear: Fade in + slide up (0.3s ease-out)
- Loading indicator: Pulse animation
- Button press: Scale down to 0.95 (framer-motion)

## Integration with Existing Systems

### Authentication

**Pattern**: Use existing AuthContext and token-based authentication

```typescript
const { token } = useAuth();
const messages = useQuery(api.chat.getMessages, token ? { token } : "skip");
```

**Rationale**: Maintains consistency with existing protected routes and API patterns

### Date Formatting

**Pattern**: Use existing date utilities for calendar type support

```typescript
import { useSettings } from "@/contexts/SettingsContext";

const { settings } = useSettings();
const formattedDate = settings.calendar === "jalali" 
  ? formatJalaliDate(timestamp)
  : formatGregorianDate(timestamp);
```

**Rationale**: Respects user's calendar preference (Jalali/Gregorian)

### Currency Formatting

**Pattern**: Use existing currency formatter from settings

```typescript
const formattedAmount = formatCurrency(amount, settings.currency);
```

**Rationale**: Ensures consistency with expense/income displays throughout the app

### Navigation

**Pattern**: Add chat link to existing BottomNav component

```typescript
const navItems = [
  // ... existing items
  {
    href: "/chat",
    icon: MessageCircle,
    label: "Chat",
  },
];
```

**Rationale**: Maintains consistent navigation pattern across the app

## Configuration

### Environment Variables

**Required**:
- `OPENROUTER_API_KEY`: API key for OpenRouter service
- `OPENROUTER_MODEL`: Model identifier (default: `openai/gpt-4.1-nano`)

**Optional**:
- `CHAT_RATE_LIMIT`: Messages per hour per user (default: 50)
- `CHAT_CONTEXT_LIMIT`: Number of messages in context (default: 10)
- `CHAT_TRANSACTION_MONTHS`: Months of transaction history (default: 12)

### Feature Flags

**Future Enhancements**:
- `ENABLE_CHAT_STREAMING`: Enable streaming responses
- `ENABLE_CHAT_EXPORT`: Allow exporting chat history
- `ENABLE_CHAT_VOICE`: Voice input support

## Design Decisions and Rationales

### 1. Server-Side AI Processing

**Decision**: Execute all OpenRouter API calls on the Convex backend

**Rationale**:
- Protects API key from exposure
- Enables access to full transaction dataset without client-side transfer
- Simplifies error handling and retry logic
- Reduces client-side complexity

### 2. Message Persistence

**Decision**: Store all messages in Convex database

**Rationale**:
- Enables conversation history across sessions
- Provides audit trail for debugging
- Allows future features like chat export
- Maintains data consistency with existing patterns

### 3. Context Window Limitation

**Decision**: Include only last 10 messages in AI context

**Rationale**:
- Balances context awareness with token cost
- Prevents context window overflow with large conversations
- Improves response time by reducing prompt size
- Sufficient for most follow-up question scenarios

### 4. Free-Tier Model Selection

**Decision**: Default to `openai/gpt-4.1-nano` model

**Rationale**:
- Free tier reduces operational costs
- Large context window handles extensive transaction data
- Sufficient accuracy for financial queries
- Configurable for future upgrades

### 5. Suggested Prompts

**Decision**: Display 3 pre-written example questions in empty state

**Rationale**:
- Reduces friction for first-time users
- Demonstrates capabilities clearly
- Provides immediate value without learning curve
- Common pattern in chat interfaces

### 6. Character Limit

**Decision**: Enforce 500 character limit on user messages

**Rationale**:
- Prevents abuse and excessive token usage
- Encourages concise, focused questions
- Sufficient for most financial queries
- Aligns with conversational interface best practices

### 7. Auto-Scroll Behavior

**Decision**: Auto-scroll to bottom only when user hasn't manually scrolled up

**Rationale**:
- Prevents interrupting user when reading history
- Maintains expected behavior for new messages
- Common pattern in messaging applications
- Improves user experience

### 8. Inline Transaction Data

**Decision**: Include full transaction data in system prompt rather than using function calling

**Rationale**:
- Simpler implementation without function calling complexity
- Works with all OpenRouter models (not all support functions)
- Sufficient for current dataset sizes
- Easier to debug and maintain

## Future Enhancements

### Phase 2 Features

1. **Chat Export**: Allow users to export conversation history as PDF or text
2. **Voice Input**: Add speech-to-text for hands-free queries
3. **Suggested Follow-ups**: AI suggests relevant follow-up questions
4. **Chart Generation**: Generate visual charts based on queries
5. **Multi-language Support**: Support Persian language queries

### Phase 3 Features

1. **Streaming Responses**: Real-time token streaming for faster perceived performance
2. **Smart Caching**: Cache responses for common queries
3. **Budget Alerts**: Proactive AI notifications about spending patterns
4. **Comparative Analysis**: "Compare this month to last month" queries
5. **Financial Advice**: Personalized savings and budgeting recommendations

### Technical Debt Considerations

1. **Message Pagination**: Implement pagination for conversations >100 messages
2. **Context Optimization**: Implement smarter context selection (relevance-based)
3. **Error Telemetry**: Add comprehensive error tracking and monitoring
4. **A/B Testing**: Framework for testing different prompts and models
5. **Performance Monitoring**: Track response times and optimize bottlenecks
