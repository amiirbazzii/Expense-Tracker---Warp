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

// ── Mutations ───────────────────────────────────────────────────────────

export const createLoan = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    totalAmount: v.number(),
    totalInstallments: v.number(),
    paidInstallments: v.number(),
    installmentAmount: v.number(),
    monthlyPaymentDay: v.number(),
    startMonth: v.number(),
    startYear: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    if (args.monthlyPaymentDay < 1 || args.monthlyPaymentDay > 31) {
      throw new ConvexError("Monthly payment day must be between 1 and 31.");
    }
    if (args.totalInstallments < 1) {
      throw new ConvexError("Total installments must be at least 1.");
    }
    if (args.paidInstallments < 0 || args.paidInstallments >= args.totalInstallments) {
      throw new ConvexError("Paid installments must be between 0 and total installments - 1.");
    }

    return await ctx.db.insert("loans", {
      name: args.name,
      totalAmount: args.totalAmount,
      totalInstallments: args.totalInstallments,
      paidInstallments: args.paidInstallments,
      installmentAmount: args.installmentAmount,
      monthlyPaymentDay: args.monthlyPaymentDay,
      startMonth: args.startMonth,
      startYear: args.startYear,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updateLoan = mutation({
  args: {
    token: v.string(),
    loanId: v.id("loans"),
    name: v.string(),
    totalAmount: v.number(),
    totalInstallments: v.number(),
    paidInstallments: v.number(),
    installmentAmount: v.number(),
    monthlyPaymentDay: v.number(),
    startMonth: v.number(),
    startYear: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.userId !== user._id) {
      throw new ConvexError("Loan not found or not authorized.");
    }

    await ctx.db.patch(args.loanId, {
      name: args.name,
      totalAmount: args.totalAmount,
      totalInstallments: args.totalInstallments,
      paidInstallments: args.paidInstallments,
      installmentAmount: args.installmentAmount,
      monthlyPaymentDay: args.monthlyPaymentDay,
      startMonth: args.startMonth,
      startYear: args.startYear,
    });

    return { success: true };
  },
});

export const deleteLoan = mutation({
  args: {
    token: v.string(),
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new ConvexError("Loan not found.");
    }
    if (loan.userId !== user._id) {
      throw new ConvexError("Not authorized to delete this loan.");
    }

    await ctx.db.delete(args.loanId);
    return { success: true };
  },
});

export const payInstallment = mutation({
  args: {
    token: v.string(),
    loanId: v.id("loans"),
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.array(v.string()),
    date: v.number(),
    cardId: v.optional(v.id("cards")),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.userId !== user._id) {
      throw new ConvexError("Loan not found or not authorized.");
    }

    if (loan.paidInstallments >= loan.totalInstallments) {
      throw new ConvexError("All installments have already been paid.");
    }

    await ctx.db.patch(args.loanId, {
      paidInstallments: loan.paidInstallments + 1,
    });

    const expenseId = await ctx.db.insert("expenses", {
      amount: args.amount,
      title: args.title,
      category: args.category,
      for: args.for,
      date: args.date,
      cardId: args.cardId,
      userId: user._id,
      createdAt: Date.now(),
    });

    return { expenseId };
  },
});

// ── Queries ─────────────────────────────────────────────────────────────

export const getLoans = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    return await ctx.db
      .query("loans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getLoanSummary = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeLoans = loans.filter(
      (l) => l.paidInstallments < l.totalInstallments
    );

    const totalAmount = loans.reduce((sum, l) => sum + l.totalAmount, 0);
    const remainingBalance = activeLoans.reduce(
      (sum, l) => sum + l.installmentAmount * (l.totalInstallments - l.paidInstallments),
      0
    );

    return {
      activeCount: activeLoans.length,
      totalAmount,
      remainingBalance,
    };
  },
});
