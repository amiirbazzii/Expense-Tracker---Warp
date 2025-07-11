import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper function to get user by token
async function getUserByToken(ctx: any, token: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", token))
    .first();

  if (!user) {
    throw new ConvexError("Authentication required");
  }

  return user;
}

// Card Operations
export const addCard = mutation({
  args: {
    token: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db.insert("cards", {
      name: args.name,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const getMyCards = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db
      .query("cards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const deleteCard = mutation({
  args: {
    token: v.string(),
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const card = await ctx.db.get(args.cardId);

    if (!card || card.userId !== user._id) {
      throw new ConvexError("Card not found or not authorized to delete");
    }

    const expensesUsingCard = await ctx.db
      .query("expenses")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .first();

    if (expensesUsingCard) {
      throw new ConvexError("Cannot delete card used in expenses");
    }

    const incomeUsingCard = await ctx.db
      .query("income")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .first();

    if (incomeUsingCard) {
      throw new ConvexError("Cannot delete card used in income");
    }

    await ctx.db.delete(args.cardId);
  },
});

// Income Operations
export const createIncome = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
    cardId: v.id("cards"),
    date: v.number(),
    source: v.string(),
    category: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db.insert("income", {
      amount: args.amount,
      cardId: args.cardId,
      date: args.date,
      source: args.source,
      category: args.category,
      notes: args.notes,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const getIncome = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db
      .query("income")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getIncomeByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    key: v.optional(v.number()), // Add a key for cache busting
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const income = await ctx.db
      .query("income")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return income.filter(incomeRecord => 
      incomeRecord.date >= args.startDate && incomeRecord.date <= args.endDate
    );
  },
});

export const getUniqueIncomeCategories = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const incomeRecords = await ctx.db
      .query("income")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const categories = incomeRecords.map((record) => record.category);
    const uniqueCategories = [...new Set(categories)];

    return uniqueCategories;
  },
});

export const getIncomeById = query({
  args: {
    token: v.string(),
    incomeId: v.id("income"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const income = await ctx.db.get(args.incomeId);
    if (!income || income.userId !== user._id) {
      throw new ConvexError("Income not found or not authorized");
    }

    return income;
  },
});

export const updateIncome = mutation({
  args: {
    token: v.string(),
    incomeId: v.id("income"),
    amount: v.number(),
    source: v.string(),
    category: v.string(),
    date: v.number(),
    cardId: v.id("cards"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const income = await ctx.db.get(args.incomeId);
    if (!income || income.userId !== user._id) {
      throw new ConvexError("Income not found or not authorized");
    }

    await ctx.db.patch(args.incomeId, {
      amount: args.amount,
      source: args.source,
      category: args.category,
      date: args.date,
      cardId: args.cardId,
      notes: args.notes,
    });

    return { success: true };
  },
});

export const deleteIncome = mutation({
  args: {
    token: v.string(),
    incomeId: v.id("income"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const income = await ctx.db.get(args.incomeId);

    if (!income) {
      throw new ConvexError("Income record not found");
    }

    if (income.userId !== user._id) {
      throw new ConvexError("You are not authorized to delete this income record");
    }

    await ctx.db.delete(args.incomeId);

    return { success: true };
  },
});

export const getCardBalances = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    // Get all cards for the user
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all income and expenses for the user
    const income = await ctx.db
      .query("income")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Calculate balances for each card
    const cardBalances = cards.map(card => {
      const cardIncome = income
        .filter(inc => inc.cardId === card._id)
        .reduce((sum, inc) => sum + inc.amount, 0);

      const cardExpenses = expenses
        .filter(exp => exp.cardId === card._id)
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        cardId: card._id,
        cardName: card.name,
        totalIncome: cardIncome,
        totalExpenses: cardExpenses,
        balance: cardIncome - cardExpenses,
      };
    });

    return cardBalances;
  },
});
