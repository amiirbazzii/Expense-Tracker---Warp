# Chat Security Implementation

This document outlines the security measures implemented for the AI Financial Chat feature.

## Overview

The chat system implements multiple layers of security to protect user data, prevent injection attacks, and ensure proper authentication and authorization.

## Security Measures

### 1. Input Sanitization

**Location**: `convex/security.ts` - `sanitizeUserInput()`

**Purpose**: Remove potentially dangerous characters and normalize input

**Implementation**:
- Removes null bytes (`\0`)
- Removes control characters (except newlines and tabs)
- Normalizes Unicode characters (NFKC) to prevent homograph attacks
- Trims whitespace
- Collapses multiple spaces/newlines

**Applied to**:
- User messages before saving to database
- User messages before sending to AI
- Historical messages when constructing AI context

### 2. Message Content Validation

**Location**: `convex/security.ts` - `validateMessageContent()`

**Purpose**: Validate message format and detect injection attempts

**Checks**:
- Type validation (must be string)
- Length validation (max 500 characters)
- Empty content detection
- Suspicious pattern detection:
  - Script tags
  - JavaScript protocol
  - Event handlers
  - Data URLs
  - Iframes

**Applied to**:
- All user messages in `saveUserMessage` mutation

### 3. Prompt Injection Prevention

**Location**: `convex/security.ts` - `sanitizeForPrompt()`

**Purpose**: Prevent users from manipulating AI behavior through transaction data

**Implementation**:
- Removes system-like instructions ("ignore previous instructions")
- Removes role-switching attempts ("you are now", "act as")
- Recursively sanitizes nested objects and arrays

**Applied to**:
- Transaction data before including in AI prompts
- Both in `sendMessage` and `retryLastMessage` actions

### 4. API Key Protection

**Location**: `convex/security.ts` - `validateApiKey()`

**Purpose**: Ensure API key is properly configured and never exposed

**Checks**:
- API key exists
- API key is a string
- API key has correct format (starts with `sk-or-v1-`)
- API key has minimum length (40+ characters)

**Implementation**:
- API key stored in environment variables only
- Never sent to frontend
- Validated on every API call
- All OpenRouter requests made server-side only

**Applied to**:
- `validateEnvironmentVariables()` function
- Called in both `sendMessage` and `retryLastMessage` actions

### 5. Authentication Token Validation

**Location**: `convex/security.ts` - `validateToken()`

**Purpose**: Validate authentication token format before database queries

**Checks**:
- Token exists
- Token is a string
- Token has minimum length (10+ characters)
- Token contains only valid characters (alphanumeric, dots, dashes, pipes, colons)

**Applied to**:
- `getUserByToken()` helper function
- Called on every query and mutation

### 6. User Authentication and Authorization

**Location**: `convex/chat.ts` - `getUserByToken()`

**Purpose**: Verify user identity on every request

**Implementation**:
- Token validation before database query
- Database lookup by token
- Returns user object or throws authentication error
- All queries filtered by authenticated userId

**Applied to**:
- `getMessages` query
- `saveUserMessage` mutation
- `saveAssistantMessage` mutation
- `sendMessage` action (via getCurrentUser)
- `retryLastMessage` action (via getCurrentUser)

### 7. Data Isolation

**Purpose**: Ensure users can only access their own data

**Implementation**:
- All database queries filtered by `userId`
- User ID obtained from authenticated token
- No cross-user data access possible
- Messages, transactions, and settings all scoped to user

**Applied to**:
- Message queries (by_user_timestamp index)
- Transaction queries (expenses, income, cards)
- User settings queries

### 8. Frontend Validation

**Location**: `src/app/chat/ChatInput.tsx`

**Purpose**: Provide immediate feedback and prevent invalid input

**Implementation**:
- Character limit enforcement (500 chars)
- Real-time character counter (shown at 400+ chars)
- Null byte and control character removal
- Empty/whitespace-only message prevention
- Send button disabled when invalid

**Benefits**:
- Better user experience
- Reduces invalid API calls
- Defense in depth (client + server validation)

## Security Best Practices

### Environment Variables

**Required Variables**:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4.1-nano
```

**Security Notes**:
- Never commit API keys to version control
- Use `.env.local` for local development
- Use Convex dashboard for production secrets
- Rotate keys regularly
- Monitor API usage for anomalies

### Error Handling

**Principles**:
- Never expose internal errors to users
- Log detailed errors server-side only
- Return generic error messages to frontend
- Handle authentication errors with redirect
- Provide actionable error messages

**Implementation**:
- Try-catch blocks in all actions
- ConvexError for user-facing errors
- Console.error for debugging
- Specific error types (authentication, validation, API)

### Rate Limiting

**Location**: `convex/security.ts` - `checkRateLimit()`

**Purpose**: Prevent abuse and excessive API usage

**Configuration**:
- Default: 50 messages per hour per user
- Configurable via RateLimitConfig
- Returns reset time when exceeded

**Status**: Utility function created, not yet implemented in actions

**Future Implementation**:
- Track message count per user per hour
- Store in database or in-memory cache
- Check before processing messages
- Return error with reset time

## Testing Security

### Manual Testing Checklist

- [ ] Try sending empty messages
- [ ] Try sending messages over 500 characters
- [ ] Try sending messages with null bytes
- [ ] Try sending messages with control characters
- [ ] Try sending messages with script tags
- [ ] Try prompt injection in transaction titles/notes
- [ ] Try accessing chat without authentication
- [ ] Try accessing another user's messages
- [ ] Verify API key never appears in network requests
- [ ] Verify API key never appears in frontend code

### Automated Testing

**Recommended Tests**:
1. Input sanitization unit tests
2. Message validation unit tests
3. Token validation unit tests
4. API key validation unit tests
5. Prompt injection prevention tests
6. Authentication integration tests
7. Authorization integration tests

## Compliance

### Data Protection

- User data never leaves secure backend context
- All data scoped to authenticated user
- No data sharing between users
- Transaction data sanitized before AI processing

### Privacy

- Messages stored with user association
- No message content analysis or logging
- API calls made server-side only
- No third-party tracking or analytics

## Incident Response

### If API Key is Compromised

1. Immediately rotate the API key in OpenRouter dashboard
2. Update environment variable in Convex
3. Review API usage logs for suspicious activity
4. Monitor for unusual patterns
5. Consider implementing additional rate limiting

### If Injection Attack is Detected

1. Review logs to identify attack vector
2. Update sanitization rules if needed
3. Check for any data corruption
4. Notify affected users if necessary
5. Implement additional validation

## Future Enhancements

### Planned Security Improvements

1. **Rate Limiting Implementation**: Add per-user message count tracking
2. **Content Filtering**: Add profanity and inappropriate content detection
3. **Audit Logging**: Log all security-relevant events
4. **IP-based Rate Limiting**: Prevent distributed attacks
5. **Message Encryption**: Encrypt messages at rest
6. **Two-Factor Authentication**: Add 2FA for sensitive operations
7. **Security Headers**: Add CSP and other security headers
8. **Penetration Testing**: Regular security audits

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Convex Security Best Practices](https://docs.convex.dev/security)
