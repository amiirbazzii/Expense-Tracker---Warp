# Chat Feature Test Queries

Use these example queries to test the AI chat feature and verify it's working correctly with different models.

## 🎯 Basic Queries (Start Here)

### 1. Simple Category Spending
```
How much did I spend on coffee last month?
```
**Expected**: Should return total amount spent on coffee category for the previous month.

```
What did I spend on groceries this month?
```
**Expected**: Should return total for groceries in current month.

```
How much have I spent on restaurants this year?
```
**Expected**: Should return year-to-date restaurant spending.

### 2. Total Spending
```
What's my total spending this month?
```
**Expected**: Should return total across all categories for current month.

```
How much did I spend last month?
```
**Expected**: Should return total for previous month.

```
What's my spending for the last 3 months?
```
**Expected**: Should return total for last 3 months combined.

## 🔍 Intermediate Queries

### 3. Category Comparisons
```
Did I spend more on coffee or restaurants last month?
```
**Expected**: Should compare both categories and tell you which was higher.

```
Compare my spending on groceries vs entertainment this month
```
**Expected**: Should show amounts for both and indicate which is higher.

```
What did I spend more on: transport or food last quarter?
```
**Expected**: Should compare both categories for the last 3 months.

### 4. Top Categories
```
What are my top 3 spending categories this month?
```
**Expected**: Should list the 3 categories with highest spending.

```
Show me my top 5 expenses last month
```
**Expected**: Should list top 5 categories by amount.

```
What's my biggest spending category this year?
```
**Expected**: Should identify the single highest category.

## 🧪 Advanced Queries

### 5. Multiple Time Periods
```
How much did I spend on coffee in the last 5 months?
```
**Expected**: Should aggregate coffee spending over 5 months.

```
What's my total spending for the last quarter?
```
**Expected**: Should return 3-month total.

```
Show me my spending this year so far
```
**Expected**: Should return year-to-date total.

### 6. Specific Date Ranges
```
How much did I spend last week?
```
**Expected**: Should return previous week's total.

```
What did I spend on food this week?
```
**Expected**: Should return current week's food spending.

```
Show me my expenses for the last 30 days
```
**Expected**: Should return 30-day total.

## 🎭 Edge Cases & Clarification Tests

### 7. Ambiguous Queries (Should Ask for Clarification)
```
How much did I spend?
```
**Expected**: Should ask "For which time period?" or similar clarification.

```
What's my spending on coffee?
```
**Expected**: Should ask "For which time period?" since no timeframe specified.

```
Compare my spending
```
**Expected**: Should ask which categories to compare.

### 8. No Data Scenarios
```
How much did I spend on unicorns last month?
```
**Expected**: Should say "I couldn't find transactions for that request."

```
What did I spend on coffee in 1990?
```
**Expected**: Should indicate no data found for that period.

## 💡 Natural Language Variations

### 9. Different Phrasings (Same Intent)
```
Coffee expenses last month?
```
```
Last month's coffee spending
```
```
Tell me about my coffee purchases from last month
```
**Expected**: All should return the same coffee spending data.

### 10. Casual Language
```
How much money did I blow on restaurants?
```
```
What's the damage for shopping this month?
```
```
Did I go crazy with my coffee spending?
```
**Expected**: Should understand casual language and return appropriate data.

## 🔢 Expected Response Format

Good responses should include:
- ✅ Specific amounts with currency symbol
- ✅ Date range mentioned ("last month", "January 2024", etc.)
- ✅ Category names
- ✅ Comparisons when requested
- ✅ Friendly, conversational tone

Example good response:
> "You spent $127.50 on coffee last month (November 2024). That's across 15 transactions."

## 🚨 Testing Different Models

### Test Sequence for Each Model:

1. **Basic Test**: "How much did I spend on coffee last month?"
   - ✅ Should work on all compatible models

2. **Function Calling Test**: "Compare coffee vs restaurants this month"
   - ✅ Tests if model supports function calling
   - ❌ Incompatible models will show error here

3. **Clarification Test**: "How much did I spend?"
   - ✅ Should ask for timeframe
   - Tests model's ability to identify ambiguity

4. **Complex Test**: "What are my top 3 categories last quarter?"
   - ✅ Tests multiple function calls and data aggregation

### Model-Specific Notes:

**google/gemini-flash-1.5-8b** (Default)
- Fast responses (1-2 seconds)
- Good accuracy
- Handles all query types well

**openai/gpt-4o-mini**
- Very accurate
- Slightly slower (2-3 seconds)
- Excellent at understanding context

**anthropic/claude-3.5-sonnet**
- Best quality responses
- Most natural language
- Slower but worth it (3-4 seconds)

## 📊 Testing Checklist

Use this checklist to verify the chat is working:

- [ ] Basic category query works
- [ ] Total spending query works
- [ ] Category comparison works
- [ ] Top categories query works
- [ ] Clarification questions work
- [ ] No data scenario handled gracefully
- [ ] Multiple time periods work
- [ ] Natural language variations understood
- [ ] Responses include currency and dates
- [ ] Error messages are helpful

## 🐛 Common Issues & Solutions

### Issue: "I couldn't find transactions"
**Cause**: No data in database for that category/timeframe
**Solution**: Try a category you know you have expenses for

### Issue: "This model may not be compatible"
**Cause**: Model doesn't support function calling
**Solution**: Switch to a recommended model (see COMPATIBLE_MODELS.md)

### Issue: Response is too generic
**Cause**: Model might not be calling functions properly
**Solution**: Check server logs, try a different model

### Issue: Clarification loop
**Cause**: Model keeps asking questions instead of answering
**Solution**: Be more specific in your query, include timeframe

## 🎓 Pro Tips

1. **Be Specific**: Include timeframe in your query
   - ✅ "Coffee spending last month"
   - ❌ "Coffee spending"

2. **Use Natural Language**: The AI understands casual speech
   - ✅ "How much did I blow on restaurants?"
   - ✅ "What's my coffee damage this month?"

3. **Test Edge Cases**: Try unusual queries to see how it handles them
   - "What did I spend on coffee in the year 3000?"
   - "Compare apples to oranges" (literal categories)

4. **Check Currency**: Responses should use your configured currency
   - USD: $123.45
   - EUR: €123.45
   - IRR: 123.45 T

5. **Verify Dates**: Make sure date ranges are correct
   - "Last month" should be previous calendar month
   - "This month" should be current month to date

## 📝 Sample Test Session

Here's a complete test session you can copy/paste:

```
1. How much did I spend on coffee last month?
2. What's my total spending this month?
3. Compare coffee vs restaurants this month
4. What are my top 3 categories last month?
5. How much did I spend on groceries in the last 3 months?
6. Did I spend more on transport or entertainment last quarter?
7. What's my biggest expense this year?
8. How much did I spend? (should ask for clarification)
9. Show me my spending on unicorns (should say no data)
10. What did I spend on food this week?
```

## 🎯 Success Criteria

The chat is working correctly if:
- ✅ Responds within 5 seconds
- ✅ Includes specific amounts and dates
- ✅ Asks for clarification when needed
- ✅ Handles "no data" gracefully
- ✅ Understands natural language
- ✅ Uses correct currency
- ✅ Provides helpful error messages
- ✅ Maintains conversation context

## 🔄 Testing Multiple Models

To compare models, ask the same question with different models:

1. Set model in `.env.local`: `OPENROUTER_MODEL=google/gemini-flash-1.5-8b`
2. Restart server
3. Ask: "How much did I spend on coffee last month?"
4. Note: response time, accuracy, tone
5. Change model and repeat

Compare:
- **Speed**: Which responds fastest?
- **Accuracy**: Which gets the numbers right?
- **Tone**: Which sounds most natural?
- **Reliability**: Which works most consistently?

## 📚 Related Documentation

- `COMPATIBLE_MODELS.md` - List of working models
- `CHAT_MODEL_COMPATIBILITY_FIX.md` - Error handling details
- `src/lib/chat/PERFORMANCE_OPTIMIZATIONS.md` - Performance features
- `src/app/api/chat/README.md` - API documentation

---

**Happy Testing! 🚀**

If you find issues or have questions, check the error messages - they now include helpful suggestions for fixing problems.
