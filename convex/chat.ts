import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { api } from "./_generated/api";
import {
  sanitizeUserInput,
  validateMessageContent,
  validateApiKey,
  validateToken,
  sanitizeForPrompt,
} from "./security";

// Helper function to validate environment variables
function validateEnvironmentVariables() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5-8b";

  // Use security utility for validation
  const validation = validateApiKey(apiKey);
  if (!validation.valid) {
    console.error("OPENROUTER_API_KEY validation failed:", validation.error);
    throw new ConvexError("OpenRouter API key not configured properly");
  }

  return { apiKey: apiKey!, model };
}

// Helper function to get user by token
async function getUserByToken(ctx: any, token: string) {
  // Validate token format first
  const tokenValidation = validateToken(token);
  if (!tokenValidation.valid) {
    console.error("Token validation failed:", tokenValidation.error);
    throw new ConvexError("Authentication required");
  }

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
    // Authenticate user (includes token validation)
    const user = await getUserByToken(ctx, args.token);

    // Query messages by userId and order by timestamp ascending
    // This ensures users can only access their own messages
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
    // Authenticate user (includes token validation)
    const user = await getUserByToken(ctx, args.token);

    // Validate and sanitize message content
    const validation = validateMessageContent(args.content, 500);
    if (!validation.valid) {
      throw new ConvexError(validation.error || "Invalid message content");
    }

    const sanitizedContent = validation.sanitized!;

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
    // Authenticate user (includes token validation)
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

// Helper function to filter transactions by date (last 12 months)
function filterTransactionsByDate(transactions: any[], monthsBack: number = 12): any[] {
  const cutoffDate = Date.now() - (monthsBack * 30 * 24 * 60 * 60 * 1000);
  return transactions.filter((t: any) => t.date >= cutoffDate);
}

// Helper function to compress transaction data for prompt
function compressTransactionData(expenses: any[], income: any[], cards: any[]): any {
  // Filter to last 12 months
  const recentExpenses = filterTransactionsByDate(expenses, 12);
  const recentIncome = filterTransactionsByDate(income, 12);

  // Compress by removing redundant fields and aggregating where possible
  return {
    expenses: recentExpenses.map((exp: any) => ({
      d: exp.date, // date
      c: exp.category, // category
      a: exp.amount, // amount
      t: exp.title, // title
      f: exp.for, // for
    })),
    income: recentIncome.map((inc: any) => ({
      d: inc.date, // date
      c: inc.category, // category
      a: inc.amount, // amount
      s: inc.source, // source
      n: inc.notes, // notes
    })),
    cards: cards?.map((card: any) => ({
      n: card.name, // name
    })) || [],
  };
}

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

      // Get recent messages for context (limit to last 10)
      const messages: any[] = await ctx.runQuery(api.chat.getMessages, { token: args.token });
      const recentMessages: any[] = messages.slice(-10);

      // Construct system prompt
      const today = new Date();
      const formattedDate: string = today.toISOString().split('T')[0];

      // Compress and filter transaction data (last 12 months only)
      const compressedData = compressTransactionData(expenses, income, cards);

      // Sanitize transaction data to prevent prompt injection
      const transactionData: any = sanitizeForPrompt(compressedData);

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

User's transactions (last 12 months): ${JSON.stringify(transactionData)}

Note: Transaction data uses compressed format - expenses: {d:date, c:category, a:amount, t:title, f:for}, income: {d:date, c:category, a:amount, s:source, n:notes}, cards: {n:name}.

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant. Always format currency amounts according to the user's currency preference.`;

      // Sanitize user input before sending to AI
      const sanitizedUserContent = sanitizeUserInput(args.content);

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
            content: sanitizeUserInput(msg.content), // Sanitize historical messages too
          })),
        {
          role: "user",
          content: sanitizedUserContent,
        },
      ];

      // Validate environment variables and get API configuration
      const { apiKey, model } = validateEnvironmentVariables();

      // Make HTTP request to OpenRouter API with 30 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
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
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (fetchError.name === 'AbortError') {
          throw new ConvexError("Request took too long. Please try again.");
        }
        throw fetchError;
      }
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

      // Get recent messages for context (limit to last 10)
      const recentMessages: any[] = messages.slice(-10);

      // Construct system prompt
      const today = new Date();
      const formattedDate: string = today.toISOString().split('T')[0];

      // Compress and filter transaction data (last 12 months only)
      const compressedData = compressTransactionData(expenses, income, cards);

      // Sanitize transaction data to prevent prompt injection
      const transactionData: any = sanitizeForPrompt(compressedData);

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

User's transactions (last 12 months): ${JSON.stringify(transactionData)}

Note: Transaction data uses compressed format - expenses: {d:date, c:category, a:amount, t:title, f:for}, income: {d:date, c:category, a:amount, s:source, n:notes}, cards: {n:name}.

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant. Always format currency amounts according to the user's currency preference.`;

      // Prepare messages for OpenRouter API with sanitized content
      const apiMessages: any[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages
          .filter((msg: any) => msg.timestamp <= lastUserMessage.timestamp)
          .map((msg: any) => ({
            role: msg.role,
            content: sanitizeUserInput(msg.content), // Sanitize historical messages
          })),
      ];

      // Validate environment variables and get API configuration
      const { apiKey, model } = validateEnvironmentVariables();

      // Make HTTP request to OpenRouter API with 30 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
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
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (fetchError.name === 'AbortError') {
          throw new ConvexError("Request took too long. Please try again.");
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      console.error("Error in retryLastMessage:", error);
      throw new ConvexError("I'm having trouble right now. Please try again.");
    }
  },
});
