# Environment Variables for Convex Functions

This document describes the environment variables required by Convex backend functions.

## Required Environment Variables

### OPENROUTER_API_KEY

**Purpose:** Authentication key for OpenRouter API service used by the AI chat feature.

**Format:** Must start with `sk-or-v1-`

**Example:** `sk-or-v1-test`

**How to get:**
1. Sign up at [OpenRouter.ai](https://openrouter.ai/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-or-v1-`)

**Security:**
- This key is only accessed server-side in Convex actions
- Never exposed to the frontend
- Validated on every API call

**Validation:**
- The `validateEnvironmentVariables()` function checks:
  - Key exists
  - Key starts with `sk-or-v1-`
- Throws `ConvexError` if validation fails

### OPENROUTER_MODEL

**Purpose:** Specifies which AI model to use for chat responses.

**Format:** Model identifier string (e.g., `provider/model-name`)

**Default:** `google/gemini-flash-1.5-8b` (if not specified)

**Recommended Free Tier Models:**
- `google/gemini-flash-1.5-8b` - Fast, large context window (default)
- `openai/gpt-4.1-nano` - Compact and efficient
- `meta-llama/llama-3.1-8b-instruct:free` - Open source
- `mistralai/mistral-7b-instruct:free` - Balanced performance

**Example:** `OPENROUTER_MODEL=google/gemini-flash-1.5-8b`

## Setting Environment Variables

### Local Development

Add to `.env.local` in project root:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemini-flash-1.5-8b
```

### Convex Dashboard

1. Go to [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add both variables with their values
5. Redeploy functions for changes to take effect

### Production Deployment

Ensure environment variables are set in your hosting platform:

**Vercel:**
- Project Settings → Environment Variables
- Add both variables
- Redeploy

**Other Platforms:**
- Use platform-specific environment variable configuration
- Ensure variables are available at runtime

## Usage in Code

The environment variables are accessed in `convex/chat.ts`:

```typescript
// Validate and retrieve environment variables
function validateEnvironmentVariables() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5-8b";

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY environment variable is not set");
    throw new ConvexError("OpenRouter API key not configured");
  }

  if (!apiKey.startsWith("sk-or-v1-")) {
    console.error("OPENROUTER_API_KEY appears to be invalid");
    throw new ConvexError("OpenRouter API key is invalid");
  }

  return { apiKey, model };
}
```

## Troubleshooting

### Error: "OpenRouter API key not configured"

**Cause:** `OPENROUTER_API_KEY` is not set

**Solution:**
1. Check `.env.local` file exists and contains the key
2. Verify the key is set in Convex dashboard
3. Redeploy Convex functions after adding the variable

### Error: "OpenRouter API key is invalid"

**Cause:** API key doesn't start with `sk-or-v1-`

**Solution:**
1. Verify you copied the complete key from OpenRouter
2. Generate a new key if necessary
3. Ensure no extra spaces or characters

### Chat feature returns errors

**Possible causes:**
- API key is invalid or expired
- No credits/quota remaining on OpenRouter account
- Model specified doesn't exist or isn't available
- Network connectivity issues

**Solution:**
1. Check Convex logs for detailed error messages
2. Verify API key is valid on OpenRouter.ai
3. Check your OpenRouter account status and credits
4. Try a different model if current one is unavailable

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Use secrets management** in production environments
3. **Rotate keys** periodically for security
4. **Monitor usage** on OpenRouter dashboard
5. **Set spending limits** on OpenRouter account to prevent unexpected charges

## Related Files

- `.env.local` - Local environment variables (not committed)
- `.env.example` - Template for environment variables
- `convex/chat.ts` - Main file using these variables
- `README.md` - User-facing documentation
