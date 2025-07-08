import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    hashedPassword: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_username", ["username"]).index("by_token", ["tokenIdentifier"]),

  expenses: defineTable({
    amount: v.number(),
    title: v.string(),
    category: v.array(v.string()),
    for: v.optional(v.string()),
    date: v.number(),
    createdAt: v.number(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]),

  categories: defineTable({
    name: v.string(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),
});
