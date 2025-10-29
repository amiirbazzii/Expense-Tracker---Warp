# Clarification Question Flow Implementation

## Overview
Implemented the clarification question flow for the AI chat feature, allowing the assistant to ask one clarifying question when user queries are ambiguous.

## Changes Made

### 1. Frontend State Management (src/app/chat/page.tsx)

Added state tracking for clarification flow:
- `awaitingClarification`: Boolean flag to track if we're waiting for user's clarification response
- `originalQuery`: Stores the original user query in case clarification is needed

### 2. Message Submission Logic (src/app/chat/page.tsx)

Updated `handleSubmit` function to:
- Store original query when user sends a new message
- Track clarification state when assistant asks for clarification
- Send `isRespondingToClarification` flag to API when user responds to clarification
- Reset clarification state after receiving final answer

### 3. API Route Updates (src/app/api/chat/route.ts)

Added clarification detection logic:
- New `hasClarificationInHistory()` function to check if clarification was already asked
- Updated `processChatMessage()` to accept `isRespondingToClarification` parameter
- Clarification detection logic:
  - Only marks as clarification if message contains '?'
  - Only if no clarification was already asked in conversation
  - Only if not responding to a clarification
- Ensures only ONE clarification per user query (Requirement 5.2)

### 4. Visual Indicators (src/components/chat/MessageBubble.tsx)

Enhanced message display:
- Added special styling for clarification questions (blue background with border)
- Added "Clarification needed" badge with icon
- Distinguishes clarification questions from regular assistant responses

## Requirements Satisfied

✅ **5.1**: Detect when API response includes requiresClarification flag
- API sets `requiresClarification: true` when asking clarification
- Frontend receives and stores this in message metadata

✅ **5.2**: Limit to one clarification per user query
- `hasClarificationInHistory()` prevents multiple clarifications
- State management ensures clarification flow completes before allowing new one

✅ **5.3**: Display clarification question as assistant message
- Clarification questions displayed as regular assistant messages
- Special visual styling (blue background) distinguishes them
- "Clarification needed" badge added for clarity

✅ **5.4**: Handle user's clarification response
- User response sent with `isRespondingToClarification: true` flag
- Complete conversation history sent to API for context
- API processes response with full context to provide final answer

✅ **5.5**: Send complete context to API for final answer
- Conversation history includes original query and clarification question
- User's clarification response added to history
- API receives full context to generate accurate final answer

## Flow Diagram

```
User Query (ambiguous)
    ↓
API detects ambiguity (no function call, contains '?')
    ↓
API returns { requiresClarification: true }
    ↓
Frontend sets awaitingClarification = true
    ↓
Clarification question displayed with special styling
    ↓
User responds to clarification
    ↓
Frontend sends with isRespondingToClarification = true
    ↓
API processes with full context (original + clarification + response)
    ↓
API calls appropriate function and returns final answer
    ↓
Frontend resets clarification state
    ↓
Final answer displayed
```

## Example Scenarios

### Scenario 1: Missing Timeframe
```
User: "How much did I spend on coffee?"
Assistant: [Clarification] "Which time period would you like to know about? Last month, this month, or a different timeframe?"
User: "Last month"
Assistant: "You spent $45.50 on Coffee in the last month (Nov 1-30, 2024)."
```

### Scenario 2: Unclear Category
```
User: "Show me my food spending"
Assistant: [Clarification] "Would you like to see Restaurant, Groceries, or both categories?"
User: "Both"
Assistant: "In the last month, you spent $120 on Restaurant and $85 on Groceries, totaling $205."
```

### Scenario 3: No Clarification Needed
```
User: "How much did I spend on coffee last month?"
Assistant: "You spent $45.50 on Coffee in the last month (Nov 1-30, 2024)."
```

## Testing Recommendations

Manual testing scenarios:
1. Send ambiguous query without timeframe → Should ask for clarification
2. Respond to clarification → Should get final answer
3. Send clear query → Should get direct answer without clarification
4. Try to trigger multiple clarifications → Should only ask once
5. Check visual styling of clarification messages

## Notes

- Clarification detection is based on presence of '?' in response
- System prompt instructs AI to ask ONE clarifying question when needed
- Conversation history is preserved throughout clarification flow
- Visual distinction helps users understand they need to provide more info
