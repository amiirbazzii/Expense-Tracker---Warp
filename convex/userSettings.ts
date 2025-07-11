import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getUserByToken } from "./auth";

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await getUserByToken({ ctx, token });

    if (!user) {
      return null;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return settings;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    currency: v.optional(
      v.union(v.literal("USD"), v.literal("EUR"), v.literal("GBP"), v.literal("IRR"))
    ),
    calendar: v.optional(v.union(v.literal("gregorian"), v.literal("jalali"))),
  },
  handler: async (ctx, { token, currency, calendar }) => {
    const user = await getUserByToken({ ctx, token });

    if (!user) {
      throw new Error("User not authenticated");
    }

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        ...(currency && { currency }),
        ...(calendar && { calendar }),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        currency: currency || "USD",
        calendar: calendar || "gregorian",
        updatedAt: Date.now(),
      });
    }
  },
});
