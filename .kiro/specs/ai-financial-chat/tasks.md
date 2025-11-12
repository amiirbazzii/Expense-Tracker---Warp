# Implementation Plan

- [x] 1. Set up backend infrastructure and database schema
  - Create the `messages` table in Convex schema with userId, role, content, timestamp, and createdAt fields
  - Add indexes for efficient querying: by_user and by_user_timestamp
  - _Requirements: 6.1, 6.2_

- [x] 2. Implement Convex chat API functions
- [x] 2.1 Create getMessages query function
  - Implement user authentication via token
  - Query messages by userId and order by timestamp ascending
  - Return all messages for the authenticated user
  - _Requirements: 6.3, 6.4_

- [x] 2.2 Create sendMessage mutation function
  - Authenticate user and validate input
  - Save user message to messages table with timestamp
  - Retrieve all user transactions (expenses, income, cards) from database
  - Get last 10 messages for conversation context
  - Construct system prompt with today's date and transaction data in JSON format
  - Make HTTP request to OpenRouter API with system prompt, context, and user message
  - Parse AI response and save assistant message to messages table
  - Handle errors and return appropriate error messages
  - _Requirements: 3.6, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 9.1, 9.4, 9.5, 11.2, 11.3, 11.4, 11.5_

- [x] 2.3 Create retryLastMessage mutation function
  - Authenticate user
  - Query last user message from database
  - Re-execute AI request with same message content
  - Save new assistant response
  - _Requirements: 9.2, 9.3_

- [x] 3. Create chat page UI components
- [x] 3.1 Create main chat page component
  - Set up Next.js page at /src/app/chat/page.tsx
  - Implement protected route with authentication check
  - Add AppHeader and BottomNav components
  - Create responsive container with mobile-first layout
  - Set up useQuery hook to fetch messages
  - Implement auto-scroll logic with ref-based scroll management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.7_

- [x] 3.2 Create MessageBubble component
  - Accept role, content, timestamp, and isLatest props
  - Implement conditional styling for user vs assistant messages
  - User messages: right-aligned, blue background (#3B82F6), white text
  - Assistant messages: left-aligned, gray background (#F3F4F6), dark text
  - Apply max-width of 80%, rounded corners, and proper padding
  - Format timestamp as relative time (<1 hour) or absolute time (≥1 hour)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 3.3 Create ChatInput component
  - Implement multi-line textarea with max 4 visible lines
  - Add 500 character limit with validation
  - Show character counter when >400 characters
  - Implement Enter to send, Shift+Enter for new line
  - Disable input and send button during loading state
  - Clear input field after successful send
  - Disable send button when input is empty or whitespace-only
  - Auto-focus textarea on component mount
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.2_

- [x] 3.4 Create EmptyState component
  - Display welcome message and subtitle
  - Show three suggested prompts: "How much did I spend this month?", "What's my biggest expense category?", "Show me my income vs expenses"
  - Implement click handler to populate input field with prompt text
  - Allow user to edit populated text before sending
  - Conditionally render only when no messages exist
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.5 Create LoadingIndicator component
  - Display "Thinking..." message styled as assistant message
  - Add subtle pulse animation
  - Show only while waiting for AI response
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 4. Implement chat page logic and state management
- [x] 4.1 Set up message sending flow
  - Create useMutation hook for sendMessage
  - Handle form submission and input validation
  - Display user message immediately in UI (optimistic update)
  - Show loading indicator while waiting for response
  - Update UI with assistant response when received
  - _Requirements: 3.6, 5.1, 5.2_

- [x] 4.2 Implement error handling UI
  - Display user-friendly error message when API fails
  - Show "Try Again" button with error message
  - Implement retry logic using retryLastMessage mutation
  - Handle authentication errors with redirect to login
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 4.3 Add auto-scroll behavior
  - Implement scroll-to-bottom on new message arrival
  - Detect manual scroll and prevent auto-scroll when user scrolled up
  - Restore auto-scroll when user scrolls to bottom
  - _Requirements: 4.7_

- [ ] 5. Update navigation to include chat link
  - Add chat navigation item to BottomNav component
  - Use MessageCircle icon from lucide-react
  - Add /chat route with proper active state styling
  - _Requirements: 1.1, 1.2_

- [ ] 6. Integrate with existing systems
- [ ] 6.1 Connect to authentication system
  - Use existing AuthContext to get user token
  - Pass token to all Convex queries and mutations
  - Handle unauthenticated state with redirect
  - _Requirements: 9.4, 11.3, 11.4_

- [ ] 6.2 Integrate date and currency formatting
  - Import useSettings hook to get user preferences
  - Format timestamps according to calendar type (Jalali/Gregorian)
  - Ensure currency values in AI responses match user settings
  - _Requirements: 12.4, 12.5_

- [ ] 6.3 Apply existing design system
  - Use Tailwind CSS classes matching existing color palette
  - Apply consistent spacing, typography, and border radius
  - Ensure responsive design matches existing pages
  - Add framer-motion animations for button interactions
  - _Requirements: 12.3_

- [ ] 7. Configure environment variables and deployment
  - Add OPENROUTER_API_KEY to environment configuration
  - Add OPENROUTER_MODEL with default value
  - Validate environment variables in Convex functions
  - Document required environment variables in README
  - _Requirements: 11.1, 12.6_

- [ ] 8. Implement input sanitization and security
  - Sanitize user input before processing in backend
  - Validate message content length and format
  - Ensure API key is never exposed to frontend
  - Verify user authentication on every request
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 9. Add performance optimizations
  - Implement transaction data compression in prompt
  - Limit transaction data to last 12 months
  - Add request timeout (30 seconds)
  - Optimize message query with proper indexing
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 10. Create error boundary for chat page
  - Wrap chat page in error boundary component
  - Display fallback UI on component errors
  - Log errors for debugging
  - _Requirements: 9.1_

- [ ]* 11. Add rate limiting
  - Implement per-user message count tracking
  - Limit to 50 messages per hour per user
  - Return error with reset time when limit exceeded
  - _Requirements: 10.4_
