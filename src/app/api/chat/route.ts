import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterModel = process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5-8b";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

const convex = new ConvexHttpClient(convexUrl);

const TEMPERATURE = 0.3;
const MAX_TOKENS = 500;
const USER_MESSAGE_LIMIT = 500;
const HISTORY_LIMIT = 10;

function buildSystemPrompt({
  transactionJson,
  currency,
}: {
  transactionJson: string;
  currency?: string | null;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currencyInstruction = currency
    ? `Use ${currency} currency formatting when reporting amounts.`
    : "Use the currency present in the transaction data when reporting amounts.";

  return `You are Spendly, a friendly but concise financial assistant helping the user understand their personal finances.
Today's date: ${today}.
All information you need is included below. You must base every answer strictly on the provided transaction data.
If the data requested is missing, clearly say you can't find it and suggest the user add those transactions.
${currencyInstruction}
Provide answers in 2-3 sentences using clear language, include exact currency amounts, and never guess or invent data.
Transaction data (JSON):
${transactionJson}`;
}

async function sendToOpenRouter(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  if (!openRouterApiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": appUrl,
      "X-Title": "Spendly Financial Assistant",
    },
    body: JSON.stringify({
      model: openRouterModel,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const assistantMessage: string | undefined = data?.choices?.[0]?.message?.content?.trim();

  if (!assistantMessage) {
    throw new Error("OpenRouter returned an empty response");
  }

  return assistantMessage;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const rawMessage: string = typeof body?.message === "string" ? body.message : "";
    const message = rawMessage.trim();

    if (!message) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }

    if (message.length > USER_MESSAGE_LIMIT) {
      return NextResponse.json({ error: `Message must be ${USER_MESSAGE_LIMIT} characters or fewer.` }, { status: 400 });
    }

    const [user, expenses, income, settings, recentMessages] = await Promise.all([
      convex.query(api.auth.getCurrentUser, { token }),
      convex.query(api.expenses.getExpenses, { token }),
      convex.query(api.cardsAndIncome.getIncome, { token }),
      convex.query(api.userSettings.get, { token }),
      convex.query(api.chat.listMessages, { token, limit: HISTORY_LIMIT }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const transactions = { expenses, income };
    const transactionJson = JSON.stringify(transactions, null, 2);
    const systemPrompt = buildSystemPrompt({
      transactionJson,
      currency: settings?.currency ?? null,
    });

    const historyMessages = (recentMessages as Doc<"chatMessages">[]).map((entry) => ({
      role: entry.role as "assistant" | "user",
      content: entry.content,
    }));

    await convex.mutation(api.chat.addMessage, {
      token,
      role: "user",
      content: message,
    });

    const openRouterMessages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMessages,
      { role: "user" as const, content: message },
    ];

    const assistantContent = await sendToOpenRouter(openRouterMessages);

    await convex.mutation(api.chat.addMessage, {
      token,
      role: "assistant",
      content: assistantContent,
    });

    return NextResponse.json({
      message: assistantContent,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("/api/chat error", error);
    return NextResponse.json(
      { error: "I'm having trouble right now. Please try again." },
      { status: 500 }
    );
  }
}
