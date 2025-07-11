import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    hashedPassword: v.string(),
    tokenIdentifier: v.string(),
    hasSeenOnboarding: v.optional(v.boolean()),
  }).index("by_username", ["username"]).index("by_token", ["tokenIdentifier"]),

  expenses: defineTable({
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.array(v.string()),
    date: v.number(),
    createdAt: v.number(),
    userId: v.id("users"),
    cardId: v.optional(v.id("cards")),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]).index("by_card", ["cardId"]),

  categories: defineTable({
    name: v.string(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),

  forValues: defineTable({
    value: v.string(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]).index("by_user_value", ["userId", "value"]),

  cards: defineTable({
    name: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
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
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
