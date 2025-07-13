import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedIncomeCategoriesForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existingCategories = await ctx.db
      .query("incomeCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingCategories.length > 0) {
      return "User already has income categories. No action taken.";
    }

    const defaultIncomeCategories = [
      "Salary",
      "Freelance",
      "Investment",
      "Gift",
      "Other",
    ];

    for (const categoryName of defaultIncomeCategories) {
      await ctx.db.insert("incomeCategories", {
        name: categoryName,
        userId: userId,
      });
    }

    return `Successfully seeded ${defaultIncomeCategories.length} income categories.`;
  },
});
