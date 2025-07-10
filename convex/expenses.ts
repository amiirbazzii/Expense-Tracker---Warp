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

export const createExpense = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.optional(v.string()),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const expense = await ctx.db.insert("expenses", {
      amount: args.amount,
      title: args.title,
      category: args.category,
      for: args.for,
      date: args.date,
      createdAt: Date.now(),
      userId: user._id,
    });

    // Add categories to user's categories if they don't exist
    for (const categoryName of args.category) {
      const existingCategory = await ctx.db
        .query("categories")
        .withIndex("by_user_name", (q) => q.eq("userId", user._id).eq("name", categoryName))
        .first();

      if (!existingCategory) {
        await ctx.db.insert("categories", {
          name: categoryName,
          userId: user._id,
        });
      }
    }

    return expense;
  },
});

export const getExpenses = query({
  args: {
    token: v.string(),
    month: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    let query = ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const expenses = await query.collect();

    // Filter by month/year if provided
    if (args.month !== undefined && args.year !== undefined) {
      const startOfMonth = new Date(args.year, args.month - 1, 1).getTime();
      const endOfMonth = new Date(args.year, args.month, 0).getTime();

      return expenses.filter(expense => 
        expense.date >= startOfMonth && expense.date <= endOfMonth
      );
    }

    return expenses;
  },
});

export const getExpensesByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return expenses.filter(expense => 
      expense.date >= args.startDate && expense.date <= args.endDate
    );
  },
});

export const updateExpense = mutation({
  args: {
    token: v.string(),
    expenseId: v.id("expenses"),
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.optional(v.string()),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    // Verify the expense belongs to the user
    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== user._id) {
      throw new ConvexError("Expense not found or not authorized");
    }

    // Update the expense
    await ctx.db.patch(args.expenseId, {
      amount: args.amount,
      title: args.title,
      category: args.category,
      for: args.for,
      date: args.date,
    });

    // Add new categories to user's categories if they don't exist
    for (const categoryName of args.category) {
      const existingCategory = await ctx.db
        .query("categories")
        .withIndex("by_user_name", (q) => q.eq("userId", user._id).eq("name", categoryName))
        .first();

      if (!existingCategory) {
        await ctx.db.insert("categories", {
          name: categoryName,
          userId: user._id,
        });
      }
    }

    return { success: true };
  },
});

export const deleteExpense = mutation({
  args: {
    token: v.string(),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    // Verify the expense belongs to the user
    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== user._id) {
      throw new ConvexError("Expense not found or not authorized");
    }

    // Delete the expense
    await ctx.db.delete(args.expenseId);

    return { success: true };
  },
});

export const getExpenseById = query({
  args: {
    token: v.string(),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== user._id) {
      throw new ConvexError("Expense not found or not authorized");
    }

    return expense;
  },
});

export const getCategories = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
