import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Not authenticated
      return null;
    }
    // The user's tokenIdentifier is in identity.tokenIdentifier
    // The user'sconvex _id is in identity.subject

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      // This case should ideally not happen if tokenIdentifier is valid
      return null;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // If no settings found, create and return default settings
    if (!settings) {
      const defaultSettings = {
        userId: user._id,
        currency: "USD" as const,
        calendar: "gregorian" as const,
        updatedAt: Date.now(),
      };
      await ctx.db.insert("userSettings", defaultSettings);
      return defaultSettings;
    }

    return settings;
  },
});

export const updateSettings = mutation({
  args: {
    currency: v.optional(
      v.union(
        v.literal("USD"),
        v.literal("EUR"),
        v.literal("GBP"),
        v.literal("IRR")
      )
    ),
    calendar: v.optional(
      v.union(v.literal("gregorian"), v.literal("jalali"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const dataToUpdate: {
      userId: typeof user._id; // Use the type of user._id
      currency?: "USD" | "EUR" | "GBP" | "IRR";
      calendar?: "gregorian" | "jalali";
      updatedAt: number;
    } = {
      userId: user._id,
      updatedAt: Date.now(),
    };

    if (args.currency) {
      dataToUpdate.currency = args.currency;
    }
    if (args.calendar) {
      dataToUpdate.calendar = args.calendar;
    }

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, dataToUpdate);
    } else {
      // Ensure all required fields are present for a new document, using defaults if necessary
      const newSettingsData = {
        ...dataToUpdate,
        currency: args.currency || "USD", // Default to USD if not provided
        calendar: args.calendar || "gregorian", // Default to Gregorian if not provided
      };
      await ctx.db.insert("userSettings", newSettingsData);
    }

    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

// Helper to ensure settings exist for a user, creating defaults if not.
// This can be called on user creation or when settings are first accessed.
export const ensureSettingsForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existingSettings) {
      await ctx.db.insert("userSettings", {
        userId,
        currency: "USD", // Default currency
        calendar: "gregorian", // Default calendar
        updatedAt: Date.now(),
      });
      console.log(`Default settings created for user ${userId}`);
    }
    return await ctx.db.query("userSettings").withIndex("by_user", q => q.eq("userId", userId)).unique();
  }
});
