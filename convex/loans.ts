import { v } from "convex/values";
import { idempotentMutation } from "./idempotency";
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

// A `v.id("cards")` argument only proves the ID is well-formed, not that the
// caller owns the card. Without this check a user can attach their records to
// another user's card and corrupt that user's computed balances.
async function assertCardOwned(ctx: any, cardId: any, userId: any) {
  if (cardId === undefined) return;

  const card = await ctx.db.get(cardId);
  if (!card || card.userId !== userId) {
    throw new ConvexError("Card not found or not authorized");
  }
}

function assertValidAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ConvexError("Amount must be a positive number");
  }
}

// ── Mutations ───────────────────────────────────────────────────────────

export const createLoan = idempotentMutation({
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

export const updateLoan = idempotentMutation({
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
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteLoan = idempotentMutation({
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

export const payInstallment = idempotentMutation({
  args: {
    token: v.string(),
    loanId: v.id("loans"),
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.array(v.string()),
    date: v.number(),
    cardId: v.optional(v.id("cards")),
    // 0-based installment this payment covers. When present, the mutation is
    // idempotent: delivery is at-least-once (the client queue retries after a
    // lost response), and a bare "+1" double-charged a month per redelivery.
    // Optional only for mutations queued by older clients.
    installmentIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);
    assertValidAmount(args.amount);
    await assertCardOwned(ctx, args.cardId, user._id);

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.userId !== user._id) {
      throw new ConvexError("Loan not found or not authorized.");
    }

    if (args.installmentIndex !== undefined) {
      // Redelivery of an already-applied payment? The (loanId,
      // installmentIndex) pair on the expense is the idempotency key.
      const payments = await ctx.db
        .query("expenses")
        .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
        .collect();
      const existing = payments.find(
        (p) => p.installmentIndex === args.installmentIndex,
      );
      if (existing) {
        return { expenseId: existing._id, alreadyPaid: true };
      }

      // The counter has moved past this index without a matching tagged
      // expense (paid from another device, or by a legacy mutation). Applying
      // it anyway would charge the month twice — acknowledge instead.
      if (loan.paidInstallments !== args.installmentIndex) {
        return { expenseId: null, alreadyPaid: true };
      }
    }

    if (loan.paidInstallments >= loan.totalInstallments) {
      throw new ConvexError("All installments have already been paid.");
    }

    await ctx.db.patch(args.loanId, {
      paidInstallments: loan.paidInstallments + 1,
      updatedAt: Date.now(),
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
      loanId: args.loanId,
      installmentIndex: args.installmentIndex,
    });

    return { expenseId, alreadyPaid: false };
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
