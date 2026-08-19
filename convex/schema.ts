import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    hashedPassword: v.string(),
    tokenIdentifier: v.string(),
    hasSeenOnboarding: v.optional(v.boolean()),
    hashedRecoveryCode: v.optional(v.string()),
    recoveryCodeCreatedAt: v.optional(v.number()),
  })
    .index("by_username", ["username"])
    .index("by_token", ["tokenIdentifier"])
    // Indexed so recovery-code lookups never scan the whole users table.
    .index("by_recovery_code", ["hashedRecoveryCode"]),

  expenses: defineTable({
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.array(v.string()),
    date: v.number(),
    createdAt: v.number(),
    userId: v.id("users"),
    cardId: v.optional(v.id("cards")),
    // Set only on loan-installment expenses: which loan and which installment
    // (0-based) this payment covers. The pair is the idempotency key that
    // lets payInstallment retries detect an already-applied payment.
    loanId: v.optional(v.id("loans")),
    installmentIndex: v.optional(v.number()),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]).index("by_card", ["cardId"]).index("by_loan", ["loanId"]),

  categories: defineTable({
    name: v.string(),
    userId: v.id("users"),
    isArchived: v.optional(v.boolean()),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),

  forValues: defineTable({
    value: v.string(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]).index("by_user_value", ["userId", "value"]),

  cards: defineTable({
    name: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    isArchived: v.optional(v.boolean()),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),

  income: defineTable({
    amount: v.number(),
    cardId: v.id("cards"),
    date: v.number(),
    source: v.string(),
    category: v.string(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]).index("by_card", ["cardId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    currency: v.union(
      v.literal("USD"),
      v.literal("EUR"),
      v.literal("GBP"),
      v.literal("IRR")
    ),
    calendar: v.union(v.literal("gregorian"), v.literal("jalali")),
    language: v.optional(v.union(v.literal("en"), v.literal("fa"))),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  incomeCategories: defineTable({
    name: v.string(),
    userId: v.id("users"),
    isArchived: v.optional(v.boolean()),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),

  loans: defineTable({
    name: v.string(),
    totalAmount: v.number(),
    totalInstallments: v.number(),
    paidInstallments: v.number(),
    installmentAmount: v.number(),
    monthlyPaymentDay: v.number(), // 1-31
    startMonth: v.number(), // 1-12
    startYear: v.number(),  // e.g. 2025
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // One row per applied client mutation, keyed by the offline queue item's
  // idempotency key. A retry whose first attempt actually committed (response
  // lost to a crash or dropped connection) finds its key here and gets the
  // recorded result back instead of writing a duplicate.
  mutationLog: defineTable({
    userId: v.id("users"),
    key: v.string(),
    result: v.any(),
    createdAt: v.number(),
  }).index("by_user_key", ["userId", "key"]),
});
