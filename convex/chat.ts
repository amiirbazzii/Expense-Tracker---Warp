import { v } from "convex/values";
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

// Mutation: Send a message and get AI response
export const sendMessage = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user and validate input
    const user = await getUserByToken(ctx, args.token);

    // Sanitize and validate input
    const sanitizedContent = args.content.trim();
    if (!sanitizedContent) {
      throw new ConvexError("Message content cannot be empty");
    }
    if (sanitizedContent.length > 500) {
      throw new ConvexError("Message content exceeds 500 character limit");
    }

    const timestamp = Date.now();

    // Save user message to messages table with timestamp
    await ctx.db.insert("messages", {
      userId: user._id,
      role: "user",
      content: sanitizedContent,
      timestamp,
      createdAt: timestamp,
    });

    try {
      // Retrieve all user transactions (expenses, income, cards) from database
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const income = await ctx.db
        .query("income")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const cards = await ctx.db
        .query("cards")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      // Get last 10 messages for conversation context
      const recentMessages = await ctx.db
        .query("messages")
        .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(10);

      // Reverse to get chronological order (oldest to newest)
      const conversationHistory = recentMessages.reverse();

      // Construct system prompt with today's date and transaction data in JSON format
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];

      const transactionData = {
        expenses: expenses.map(exp => ({
          date: exp.date,
          category: exp.category,
          amount: exp.amount,
          title: exp.title,
          for: exp.for,
        })),
        income: income.map(inc => ({
          date: inc.date,
          category: inc.category,
          amount: inc.amount,
          source: inc.source,
          notes: inc.notes,
        })),
        cards: cards.map(card => ({
          name: card.name,
        })),
      };

      const systemPrompt = `You are a financial assistant. Today is ${formattedDate}.

User's transactions: ${JSON.stringify(transactionData)}

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant.`;

      // Prepare messages for OpenRouter API
      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        // Add conversation history (excluding the system message and the current user message)
        ...conversationHistory
          .filter(msg => msg.timestamp < timestamp)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        {
          role: "user",
          content: sanitizedContent,
        },
      ];

      // Get API key and model from environment
      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5-8b";

      if (!apiKey) {
        throw new ConvexError("OpenRouter API key not configured");
      }

      // Make HTTP request to OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://expense-tracker.app",
          "X-Title": "Expense Tracker AI Chat",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Parse AI response
      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content;

      if (!aiMessage) {
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Save assistant message to messages table
      const assistantTimestamp = Date.now();
      await ctx.db.insert("messages", {
        userId: user._id,
        role: "assistant",
        content: aiMessage,
        timestamp: assistantTimestamp,
        createdAt: assistantTimestamp,
      });

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      // Handle errors and return appropriate error messages
      if (error instanceof ConvexError) {
        throw error;
      }

      console.error("Error in sendMessage:", error);
      throw new ConvexError("I'm having trouble right now. Please try again.");
    }
  },
});

// Mutation: Retry the last user message
export const retryLastMessage = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getUserByToken(ctx, args.token);

    // Query last user message from database
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const lastUserMessage = messages.find(msg => msg.role === "user");

    if (!lastUserMessage) {
      throw new ConvexError("No previous message to retry");
    }

    // Re-execute AI request with same message content
    try {
      // Retrieve all user transactions
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const income = await ctx.db
        .query("income")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const cards = await ctx.db
        .query("cards")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      // Get last 10 messages for conversation context (excluding messages after the retry point)
      const recentMessages = await ctx.db
        .query("messages")
        .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(10);

      const conversationHistory = recentMessages.reverse();

      // Construct system prompt
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];

      const transactionData = {
        expenses: expenses.map(exp => ({
          date: exp.date,
          category: exp.category,
          amount: exp.amount,
          title: exp.title,
          for: exp.for,
        })),
        income: income.map(inc => ({
          date: inc.date,
          category: inc.category,
          amount: inc.amount,
          source: inc.source,
          notes: inc.notes,
        })),
        cards: cards.map(card => ({
          name: card.name,
        })),
      };

      const systemPrompt = `You are a financial assistant. Today is ${formattedDate}.

User's transactions: ${JSON.stringify(transactionData)}

Calculate exact amounts from the data provided. Keep responses concise (2-3 sentences maximum). Include specific numbers and currency symbols when relevant.`;

      // Prepare messages for OpenRouter API
      const apiMessages = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...conversationHistory
          .filter(msg => msg.timestamp <= lastUserMessage.timestamp)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
      ];

      // Get API key and model from environment
      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5-8b";

      if (!apiKey) {
        throw new ConvexError("OpenRouter API key not configured");
      }

      // Make HTTP request to OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Parse AI response
      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content;

      if (!aiMessage) {
        throw new ConvexError("I'm having trouble right now. Please try again.");
      }

      // Save new assistant response
      const assistantTimestamp = Date.now();
      await ctx.db.insert("messages", {
        userId: user._id,
        role: "assistant",
        content: aiMessage,
        timestamp: assistantTimestamp,
        createdAt: assistantTimestamp,
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
