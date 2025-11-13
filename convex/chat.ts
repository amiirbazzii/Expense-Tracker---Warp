import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { api } from "./_generated/api";

// Helper function to validate environment variables
function validateEnvironmentVariables() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5-8b";

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY environment variable is not set");
    throw new ConvexError("OpenRouter API key not configured");
  }

  if (!apiKey.startsWith("sk-or-v1-")) {
    console.error("OPENROUTER_API_KEY appears to be invalid (should start with 'sk-or-v1-')");
    throw new ConvexError("OpenRouter API key is invalid");
  }

  return { apiKey, model };
}

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

// Query: Get all messages for authenticated user
export const getMessages = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getUserByToken(ctx, args.token);

    // Query messages by userId and order by timestamp ascending
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user_timestamp", (q) => 
        q.eq("userId", user._id)
      )
      .collect();

    // Return all messages for the authenticated user
    return messages;
  },
});

// Mutation: Save a user message
export const saveUserMessage = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const sanitizedContent = args.content.trim();
    if (!sanitizedContent) {
      throw new ConvexError("Message content cannot be empty");
    }
    if (sanitizedContent.length > 500) {
      throw new ConvexError("Message content exceeds 500 character limit");
    }

    const timestamp = Date.now();

    await ctx.db.insert("messages", {
      userId: user._id,
      role: "user",
      content: sanitizedContent,
      timestamp,
      createdAt: timestamp,
    });

    return { timestamp };
  },
});

// Mutation: Save an assistant message
export const saveAssistantMessage = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx, args.token);

    const timestamp = Date.now();

    await ctx.db.insert("messages", {
      userId: user._id,
      role: "assistant",
      content: args.content,
      timestamp,
      createdAt: timestamp,
    });

    return { timestamp };
  },
});

// Action: Send a message and get AI response
export const sendMessage = action({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // Save user message first
    await ctx.runMutation(api.chat.saveUserMessage, {
      token: args.token,
      content: args.content,
    });

    try {
      // Get user data for authentication
      const user: any = await ctx.runQuery(api.auth.getCurrentUser, { token: args.token });
      if (!user) {
        throw new ConvexError("Authentication required");
      }

      // Retrieve all user transactions
      const expenses: any[] = await ctx.runQuery(api.expenses.getExpenses, { token: args.token });
      const income: any[] = await ctx.runQuery(api.cardsAndIncome.getIncome, { token: args.token });
      const cards: any = await ctx.runQuery(api.cardsAndIncome.getCardBalances, { token: args.token });

      // Get user settings for currency and calendar preferences
      const userSettings: any = await ctx.runQuery(api.userSettings.get, { token: args.token });
      const currency: string = userSettings?.currency || "USD";
      const calendar: string = userSettings?.calendar || "gregorian";

      // Get recent messages for context
      const messages: any[] = await ctx.runQuery(api.chat.getMessages, { token: args.token });
      const recentMessages: any[] = messages.slice(-10);

      // Construct system prompt
      const today = new Date();
      const formattedDate: string = today.toISOString().split('T')[0];

      const transactionData: any = {
        expenses: expenses.map((exp: any) => ({
          date: exp.date,
          category: exp.category,
          amount: exp.amount,
          title: exp.title,
          for: exp.for,
        })),
        income: income.map((inc: any) => ({
          date: inc.date,
          category: inc.category,
          amount: inc.amount,
          source: inc.source,
          notes: inc.notes,
        })),
        cards: cards?.map((card: any) => ({
          name: card.name,
        })) || [],
      };

      // Currency symbol mapping
      const currencySymbols: Record<string, string> = {
        USD: "$",
        EUR: "€",
        GBP: "£",
        IRR: "T",
      };
      const currencySymbol: string = currencySymbols[currency] || "$";
      const currencyFormat: string = currency === "IRR" ? "amount T" : `${currencySymbol}amount`;

      const systemPrompt: string = `You are a financial assistant. Today is ${formattedDate}.

User's preferences:
- Currency: ${currency} (format amounts as: ${currencyFormat})
- Calendar: ${calendar}

User's transactions: ${JSON.stringify(transactionData)}

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant. Always format currency amounts according to the user's currency preference.`;

      // Prepare messages for OpenRouter API
      const apiMessages: any[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages
          .slice(0, -1) // Exclude the message we just added
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        {
          role: "user",
          content: args.content.trim(),
        },
      ];

      // Validate environment variables and get API configuration
      const { apiKey, model } = validateEnvironmentVariables();

      // Make HTTP request to OpenRouter API
      const response: Response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://expense-tracker.app",
          "X-Title": "Expense Tracker AI Chat",
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText: string = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Parse AI response
      const data: any = await response.json();
      const aiMessage: string = data.choices?.[0]?.message?.content;

      if (!aiMessage) {
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Save assistant message
      await ctx.runMutation(api.chat.saveAssistantMessage, {
        token: args.token,
        content: aiMessage,
      });

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      console.error("Error in sendMessage:", error);
      throw new ConvexError("I'm having trouble right now. Please try again.");
    }
  },
});

// Action: Retry the last user message
export const retryLastMessage = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    try {
      // Get user data
      const user: any = await ctx.runQuery(api.auth.getCurrentUser, { token: args.token });
      if (!user) {
        throw new ConvexError("Authentication required");
      }

      // Get messages
      const messages: any[] = await ctx.runQuery(api.chat.getMessages, { token: args.token });
      const lastUserMessage: any = [...messages].reverse().find((msg: any) => msg.role === "user");

      if (!lastUserMessage) {
        throw new ConvexError("No previous message to retry");
      }

      // Retrieve all user transactions
      const expenses: any[] = await ctx.runQuery(api.expenses.getExpenses, { token: args.token });
      const income: any[] = await ctx.runQuery(api.cardsAndIncome.getIncome, { token: args.token });
      const cards: any = await ctx.runQuery(api.cardsAndIncome.getCardBalances, { token: args.token });

      // Get user settings for currency and calendar preferences
      const userSettings: any = await ctx.runQuery(api.userSettings.get, { token: args.token });
      const currency: string = userSettings?.currency || "USD";
      const calendar: string = userSettings?.calendar || "gregorian";

      // Get recent messages for context
      const recentMessages: any[] = messages.slice(-10);

      // Construct system prompt
      const today = new Date();
      const formattedDate: string = today.toISOString().split('T')[0];

      const transactionData: any = {
        expenses: expenses.map((exp: any) => ({
          date: exp.date,
          category: exp.category,
          amount: exp.amount,
          title: exp.title,
          for: exp.for,
        })),
        income: income.map((inc: any) => ({
          date: inc.date,
          category: inc.category,
          amount: inc.amount,
          source: inc.source,
          notes: inc.notes,
        })),
        cards: cards?.map((card: any) => ({
          name: card.name,
        })) || [],
      };

      // Currency symbol mapping
      const currencySymbols: Record<string, string> = {
        USD: "$",
        EUR: "€",
        GBP: "£",
        IRR: "T",
      };
      const currencySymbol: string = currencySymbols[currency] || "$";
      const currencyFormat: string = currency === "IRR" ? "amount T" : `${currencySymbol}amount`;

      const systemPrompt: string = `You are a financial assistant. Today is ${formattedDate}.

User's preferences:
- Currency: ${currency} (format amounts as: ${currencyFormat})
- Calendar: ${calendar}

User's transactions: ${JSON.stringify(transactionData)}

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant. Always format currency amounts according to the user's currency preference.`;

      // Prepare messages for OpenRouter API
      const apiMessages: any[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages
          .filter((msg: any) => msg.timestamp <= lastUserMessage.timestamp)
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
      ];

      // Validate environment variables and get API configuration
      const { apiKey, model } = validateEnvironmentVariables();

      // Make HTTP request to OpenRouter API
      const response: Response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://expense-tracker.app",
          "X-Title": "Expense Tracker AI Chat",
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText: string = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Parse AI response
      const data: any = await response.json();
      const aiMessage: string = data.choices?.[0]?.message?.content;

      if (!aiMessage) {
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Save new assistant response
      await ctx.runMutation(api.chat.saveAssistantMessage, {
        token: args.token,
        content: aiMessage,
      });

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      console.error("Error in retryLastMessage:", error);
      throw new ConvexError("I'm having trouble right now. Please try again.");
    }
  },
});
