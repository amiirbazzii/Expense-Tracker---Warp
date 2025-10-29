# Chat API Endpoint

## Overview

The `/api/chat` endpoint provides AI-powered financial data querying using OpenRouter's API with function calling capabilities.

## Configuration

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-...  # Get from https://openrouter.ai/keys
OPENROUTER_MODEL=google/gemini-flash-1.5-8b  # Optional, defaults to free model

# Convex (already configured)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Free Model Options

The following models are completely free on OpenRouter and support function calling:
- `google/gemini-flash-1.5-8b` (recommended default)
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

## API Usage

### Request

**Endpoint:** `POST /api/chat`

**Headers:**
```
Authorization: Bearer <user-token>
Content-Type: application/json
```

**Body:**
```json
{
  "message": "How much did I spend on coffee last month?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

### Response

**Success (200):**
```json
{
  "message": "You spent $45.50 on Coffee in October 2024.",
  "timestamp": 1698765432000,
  "requiresClarification": false
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Error message",
  "code": "API_ERROR" | "NO_DATA" | "AUTH_ERROR" | "VALIDATION_ERROR" | "RATE_LIMIT"
}
```

## Error Codes

- `AUTH_ERROR`: Invalid or missing authentication token
- `VALIDATION_ERROR`: Invalid request format or parameters
- `NO_DATA`: No transactions found for the query
- `API_ERROR`: OpenRouter API error or server error
- `RATE_LIMIT`: Too many requests

## Function Calling

The API uses OpenRouter's function calling to execute the following operations:

1. **get_category_spending**: Get spending for specific categories
2. **get_total_spending**: Get total spending across all categories
3. **get_top_categories**: Get top N spending categories
4. **compare_categories**: Compare spending between categories

All calculations are performed server-side using the user's actual transaction data.

## Security

- User authentication is required for all requests
- Auth token is validated against Convex backend
- Only authenticated user's data is accessible
- Raw transaction data never sent to OpenRouter
- Only aggregated summaries are used for AI context

## Testing

To test the endpoint locally:

```bash
# Start the development server
npm run dev

# Make a test request
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend this month?"}'
```

## Implementation Details

- Uses Next.js 14 App Router API routes
- Integrates with existing Convex backend
- Supports both Gregorian and Jalali calendars
- Natural language date parsing (e.g., "last month", "last 5 months")
- Clarification questions for ambiguous queries
- Concise, numeric responses with date ranges
