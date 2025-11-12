import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getUserByToken } from "./auth";

const MAX_MESSAGE_LENGTH = 2000;

export const addMessage = mutation({
  args: {
    token: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken({ ctx, token: args.token });

    if (!user) {
      throw new ConvexError("Authentication required");
    }

    if (!args.content.trim()) {
      throw new ConvexError("Message content cannot be empty");
    }

    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw new ConvexError("Message content exceeds maximum length");
    }

    return await ctx.db.insert("chatMessages", {
      userId: user._id,
      role: args.role,
      content: args.content.trim(),
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken({ ctx, token: args.token });

    if (!user) {
      throw new ConvexError("Authentication required");
    }

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return messages.reverse();
  },
});
