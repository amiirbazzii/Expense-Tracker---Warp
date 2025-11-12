# Quick Test Queries - Copy & Paste

## 🚀 Quick Start (5 Essential Tests)

Copy and paste these into the chat to verify everything works:

### 1️⃣ Basic Query
```
How much did I spend on coffee last month?
```

### 2️⃣ Total Spending
```
What's my total spending this month?
```

### 3️⃣ Comparison
```
Did I spend more on coffee or restaurants last month?
```

### 4️⃣ Top Categories
```
What are my top 3 spending categories this month?
```

### 5️⃣ Clarification Test
```
How much did I spend?
```
*(Should ask for timeframe)*

---

## 📋 Complete Test Suite (Copy All)

```
How much did I spend on coffee last month?
What's my total spending this month?
Compare coffee vs restaurants this month
What are my top 3 categories last month?
How much did I spend on groceries in the last 3 months?
Did I spend more on transport or food last quarter?
What's my biggest expense this year?
How much did I spend?
Show me my spending on unicorns
What did I spend on food this week?
```

---

## 🎯 By Category (Pick Your Actual Categories)

Replace these with categories you actually use:

```
How much did I spend on [YOUR_CATEGORY] last month?
```

Common categories:
- Coffee ☕
- Groceries 🛒
- Restaurants 🍽️
- Transport 🚗
- Entertainment 🎬
- Shopping 🛍️
- Utilities 💡
- Rent 🏠
- Healthcare 🏥
- Fitness 💪

---

## ⏰ By Time Period

```
How much did I spend last week?
What's my spending this month?
Show me last month's expenses
What did I spend in the last 3 months?
How much have I spent this year?
What's my spending for last quarter?
```

---

## 🔥 Fun/Casual Queries

```
How much money did I blow on coffee?
What's the damage for restaurants this month?
Did I go crazy with shopping last month?
Am I spending too much on food?
Show me where my money went this month
```

---

## ✅ What Good Responses Look Like

**Good Response Example:**
> "You spent $127.50 on coffee last month (November 2024). That's across 15 transactions."

**Should Include:**
- ✅ Specific amount with currency
- ✅ Category name
- ✅ Time period
- ✅ Friendly tone

---

## ❌ Testing Error Handling

```
How much did I spend on unicorns?
```
*(Should say "no data found")*

```
Compare my spending
```
*(Should ask which categories)*

```
What did I spend?
```
*(Should ask for timeframe)*

---

## 🎮 Model Testing Sequence

Test each model with this sequence:

1. `How much did I spend on coffee last month?`
2. `Compare coffee vs restaurants this month`
3. `What are my top 3 categories?`

If all three work, the model is compatible! ✅

---

## 💡 Pro Tips

- **Include timeframe** in your query for best results
- **Use natural language** - the AI understands casual speech
- **Be specific** about categories you actually have
- **Check currency** matches your settings
- **Verify dates** are calculated correctly

---

## 🐛 Quick Troubleshooting

**No response?**
- Check server is running
- Check .env.local has OPENROUTER_API_KEY

**"Model not compatible" error?**
- Switch to: `google/gemini-flash-1.5-8b`

**"No data found"?**
- Use a category you actually have expenses for
- Check the time period has data

**Generic responses?**
- Model might not support function calling
- Try a recommended model

---

## 📱 Mobile Testing

Same queries work on mobile! Test:
- Typing on mobile keyboard
- Voice input (if available)
- Suggested prompts (empty state)

---

**Need more examples?** See `CHAT_TEST_QUERIES.md` for comprehensive testing guide.
