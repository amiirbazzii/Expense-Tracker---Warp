
# Compatible OpenRouter Models

This document lists OpenRouter models that are compatible with the chat feature's function calling capabilities.

## How to Change Models

Update the `OPENROUTER_MODEL` environment variable in your `.env.local` file:

```bash
OPENROUTER_MODEL=google/gemini-flash-1.5-8b
```

Then restart your development server.

## Recommended Models (Tested & Working)

### Free Models

1. **google/gemini-flash-1.5-8b** (Recommended Default)
   - ✅ Supports function calling
   - ✅ Fast response times
   - ✅ Good accuracy
   - ✅ Completely free
   - Model ID: `google/gemini-flash-1.5-8b`

2. **meta-llama/llama-3.1-8b-instruct:free**
   - ✅ Supports function calling
   - ✅ Good for general queries
   - ✅ Free tier available
   - Model ID: `meta-llama/llama-3.1-8b-instruct:free`

3. **mistralai/mistral-7b-instruct:free**
   - ✅ Supports function calling
   - ✅ Fast and efficient
   - ✅ Free tier available
   - Model ID: `mistralai/mistral-7b-instruct:free`

### Paid Models (Better Performance)

1. **anthropic/claude-3.5-sonnet**
   - ✅ Excellent function calling
   - ✅ Very accurate
   - ✅ Great at understanding context
   - 💰 Paid (but affordable)
   - Model ID: `anthropic/claude-3.5-sonnet`

2. **openai/gpt-4o-mini**
   - ✅ Excellent function calling
   - ✅ Fast and accurate
   - ✅ Good balance of cost/performance
   - 💰 Paid (affordable)
   - Model ID: `openai/gpt-4o-mini`

3. **openai/gpt-4o**
   - ✅ Best accuracy
   - ✅ Excellent function calling
   - ✅ Most capable
   - 💰 Paid (premium pricing)
   - Model ID: `openai/gpt-4o`

4. **google/gemini-pro-1.5**
   - ✅ Very good function calling
   - ✅ Large context window
   - ✅ Good accuracy
   - 💰 Paid
   - Model ID: `google/gemini-pro-1.5`

## Models to Avoid

Some models may not support function calling or return incompatible response formats:

- ❌ Very old models (pre-2023)
- ❌ Models without function calling support
- ❌ Some experimental or beta models
- ❌ Text completion models (use chat models instead)

## Testing a New Model

To test if a model works with the chat feature:

1. Update `OPENROUTER_MODEL` in `.env.local`
2. Restart your dev server
3. Try a simple query: "How much did I spend on coffee last month?"
4. If you get an error about "model compatibility" or "function calling", the model is not compatible

## Error Messages

### "This model may not be compatible with function calling"

This means the model either:
- Doesn't support function calling
- Returns responses in an unexpected format
- Is not a chat completion model

**Solution**: Switch to one of the recommended models above.

### "Invalid response from AI model"

This usually means:
- The model returned an empty or malformed response
- The model doesn't support the requested features

**Solution**: Try a different model from the recommended list.

## Model Selection Guide

### For Development/Testing
- Use: `google/gemini-flash-1.5-8b` (free, fast, reliable)

### For Production (Budget-Conscious)
- Use: `openai/gpt-4o-mini` (affordable, excellent quality)

### For Production (Best Quality)
- Use: `anthropic/claude-3.5-sonnet` or `openai/gpt-4o`

### For High Volume
- Use: `google/gemini-flash-1.5-8b` (free) or `google/gemini-pro-1.5` (paid, better quality)

## Checking Model Capabilities

Before using a model, check OpenRouter's documentation:
- Visit: https://openrouter.ai/models
- Look for "Function Calling" support
- Check pricing and rate limits

## Performance Comparison

| Model | Speed | Accuracy | Cost | Function Calling |
|-------|-------|----------|------|------------------|
| gemini-flash-1.5-8b | ⚡⚡⚡ | ⭐⭐⭐ | Free | ✅ |
| gpt-4o-mini | ⚡⚡ | ⭐⭐⭐⭐ | $ | ✅ |
| claude-3.5-sonnet | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$ | ✅ |
| gpt-4o | ⚡ | ⭐⭐⭐⭐⭐ | $$$ | ✅ |
| gemini-pro-1.5 | ⚡⚡ | ⭐⭐⭐⭐ | $$ | ✅ |

## Troubleshooting

### Model works but responses are poor quality
- Try increasing `temperature` in `openRouterClient.ts` (0.3 → 0.5)
- Try a more capable model
- Check if your prompts are clear

### Model is too slow
- Switch to a faster model (gemini-flash, gpt-4o-mini)
- Check your internet connection
- Verify OpenRouter service status

### Getting rate limit errors
- Wait a few minutes between requests
- Upgrade to a paid plan on OpenRouter
- Switch to a model with higher rate limits

## Need Help?

- OpenRouter Documentation: https://openrouter.ai/docs
- OpenRouter Discord: https://discord.gg/openrouter
- Check model status: https://status.openrouter.ai/
