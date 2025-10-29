# Implementation Plan

- [x] 1. Set up backend infrastructure and utilities
  - Create date utility functions for natural language date parsing (e.g., "last month", "last 5 months", "YTD")
  - Implement query interpreter to parse user messages and extract intent, categories, and date ranges
  - Create data aggregator service to compute financial summaries from user's transaction data
  - Set up OpenRouter client with environment variable configuration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 6.4_

- [x] 2. Create API route for chat functionality
  - Implement POST `/api/chat` endpoint with request validation
  - Add authentication middleware to verify user token
  - Integrate query interpreter to parse user messages
  - Connect data aggregator to fetch and compute user's financial data
  - Call OpenRouter API with system prompt and aggregated context
  - Format and return response with timestamp
  - Handle error cases (API errors, no data, auth errors)
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 8.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. Implement chat message data models and storage
  - Define Message interface with id, role, content, timestamp, and metadata
  - Create ChatHistory interface for localStorage structure
  - Implement localStorage persistence functions (save, load, clear)
  - Add user-specific storage keys using userId
  - Implement message history trimming (max 100 messages)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. Build core chat UI components
  - Create ChatPage component with state management for messages, loading, and errors
  - Implement MessageList component with auto-scroll to bottom
  - Build MessageBubble component with user/assistant styling and timestamps
  - Create ChatInput component with auto-resize textarea and character limit
  - Add TypingIndicator component for loading state
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Implement empty state and suggested prompts
  - Create SuggestedPrompts component with three predefined prompts
  - Add click handlers to populate input field with selected prompt
  - Show/hide logic based on message history length
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 6. Add chat navigation and routing
  - Add "Chat" item to BottomNav component
  - Create `/chat` route in Next.js app directory
  - Implement ProtectedRoute wrapper for authentication
  - _Requirements: 1.1, 1.2, 9.1_

- [ ] 7. Implement message submission and response handling
  - Add form submission handler in ChatPage
  - Show loading indicator when waiting for response
  - Append user message to history immediately (optimistic UI)
  - Call `/api/chat` endpoint with message and conversation history
  - Append assistant response to message history
  - Persist updated history to localStorage
  - _Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.2_

- [ ] 8. Implement clarification question flow
  - Detect when API response includes requiresClarification flag
  - Display clarification question as assistant message
  - Handle user's clarification response
  - Send complete context to API for final answer
  - Limit to one clarification per user query
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Add error handling and retry functionality
  - Implement error state management in ChatPage
  - Display appropriate error messages based on error code
  - Add "Try again" button for retryable errors
  - Implement retry logic to resubmit last user message
  - Handle authentication errors with redirect to login
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Implement history persistence and loading
  - Load chat history from localStorage on page mount
  - Display loading state while fetching history
  - Handle empty history state
  - Clear history on user logout
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 11. Add currency and date formatting
  - Format numeric amounts with currency symbol from settings
  - Format timestamps (relative for recent, absolute for older)
  - Support Jalali calendar dates when enabled in settings
  - Include date ranges in assistant responses
  - _Requirements: 3.5, 6.4_

- [ ] 12. Implement input validation and constraints
  - Add client-side validation for empty messages
  - Enforce 500 character limit on input
  - Disable input during API calls
  - Add Enter to send, Shift+Enter for new line
  - _Requirements: 3.1_

- [ ] 13. Add offline mode handling
  - Detect offline status using useOnlineStatus hook
  - Display offline message when network unavailable
  - Disable message submission when offline
  - Show cached history when offline
  - _Requirements: 7.1, 7.2_

- [ ] 14. Style and polish chat interface
  - Apply consistent styling with app theme
  - Implement responsive layout for mobile
  - Add smooth animations for message appearance
  - Style user vs assistant message bubbles differently
  - Add proper spacing and padding
  - Ensure RTL support for Persian language
  - _Requirements: 1.3, 3.4_

- [ ]* 15. Add accessibility features
  - Add ARIA labels for chat components
  - Implement keyboard navigation
  - Add screen reader announcements for new messages
  - Ensure proper focus management
  - _Requirements: 1.3, 3.1_

- [ ]* 16. Implement performance optimizations
  - Add debouncing to prevent rapid submissions
  - Implement request cancellation for pending requests
  - Add lazy loading for long message histories
  - Cache user categories for faster query parsing
  - _Requirements: 3.1, 3.2_

- [ ]* 17. Add monitoring and logging
  - Log API requests and responses server-side
  - Track error rates by type
  - Monitor API response times
  - Log query intents and date ranges for analytics
  - _Requirements: 7.1, 7.2_
