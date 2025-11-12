"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

const MAX_INPUT_LENGTH = 500;
const HISTORY_LIMIT = 200;
const SUGGESTED_PROMPTS = [
  "How much did I spend on coffee last month?",
  "What are my top 5 expense categories?",
  "Compare my spending on investments vs coffee",
];

type ChatMessageDoc = Doc<"chatMessages">;

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: "normal" | "pending" | "loading" | "failed";
};

function formatTimestamp(timestamp: number) {
  const createdAt = new Date(timestamp);
  const now = Date.now();
  if (now - timestamp < 86_400_000) {
    return formatDistanceToNow(createdAt, { addSuffix: true });
  }
  return format(createdAt, "MMM d, h:mm a");
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  const bubbleStyles = isUser ? "self-end bg-blue-600 text-white" : "self-start bg-white text-gray-900";
  const statusStyles =
    message.status === "failed"
      ? "border border-red-400"
      : message.status === "pending"
        ? "opacity-80"
        : "";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${bubbleStyles} ${statusStyles}`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        {message.status === "loading" && (
          <span className="mt-2 block text-xs text-white/90">Thinking...</span>
        )}
        {message.status === "pending" && (
          <span className={`mt-2 block text-xs ${isUser ? "text-white/80" : "text-gray-500"}`}>Sending...</span>
        )}
        {message.status === "failed" && (
          <span className="mt-2 block text-xs text-red-100">Failed to send</span>
        )}
      </div>
      <span className="text-xs text-gray-500">{formatTimestamp(message.createdAt)}</span>
    </div>
  );
}

function EmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Ask me anything about your finances!</h2>
        <p className="mt-2 text-sm text-gray-600">Pick a prompt to get started, or type your own question below.</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-500 hover:text-blue-600"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { token, isOfflineMode } = useAuth();
  const isOnline = useOnlineStatus();
  const messages = useQuery(api.chat.listMessages, token ? { token, limit: HISTORY_LIMIT } : "skip") as
    | ChatMessageDoc[]
    | undefined;

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const liveMessages = useMemo<DisplayMessage[]>(() => {
    if (!messages) return [];
    return messages.map((message) => ({
      id: String(message._id),
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      status: "normal" as const,
    }));
  }, [messages]);

  const combinedMessages = useMemo(
    () => [...liveMessages, ...optimisticMessages],
    [liveMessages, optimisticMessages]
  );

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom(combinedMessages.length < 4 ? "auto" : "smooth");
    }
  }, [combinedMessages, isNearBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    setIsNearBottom(distanceFromBottom < 80);
  }, []);

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const performSend = useCallback(
    async (messageToSend: string, clearInput = true) => {
      if (!token) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const trimmed = messageToSend.trim();
      if (!trimmed || trimmed.length > MAX_INPUT_LENGTH || isSending) {
        return;
      }

      if (clearInput) {
        setInputValue("");
      }

      setError(null);
      setIsSending(true);
      setIsNearBottom(true);

      const timestamp = Date.now();
      const optimisticUser: DisplayMessage = {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmed,
        createdAt: timestamp,
        status: "pending",
      };
      const optimisticAssistant: DisplayMessage = {
        id: `assistant-${timestamp}`,
        role: "assistant",
        content: "Thinking...",
        createdAt: timestamp,
        status: "loading",
      };
      setOptimisticMessages([optimisticUser, optimisticAssistant]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmed }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "I'm having trouble right now. Please try again.");
        }

        setOptimisticMessages([]);
        setLastFailedMessage(null);
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error
            ? sendError.message
            : "I'm having trouble right now. Please try again.";
        setError(errorMessage);
        setLastFailedMessage(trimmed);
        setOptimisticMessages([{ ...optimisticUser, status: "failed" }]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, token]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performSend(inputValue, true);
  };

  const handleRetry = () => {
    if (!lastFailedMessage) return;
    performSend(lastFailedMessage, false);
  };

  const trimmedLength = inputValue.trim().length;
  const isOverLimit = inputValue.length > MAX_INPUT_LENGTH;
  const isSendDisabled =
    !trimmedLength || isOverLimit || isSending || !token || !isOnline || isOfflineMode;

  const isLoadingMessages = messages === undefined;
  const hasPersistedMessages = (messages?.length ?? 0) > 0;
  const hasAnyMessages = hasPersistedMessages || optimisticMessages.length > 0;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AppHeader title="Chat" />

        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-hidden px-4 pb-4 pt-2">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex h-full flex-col gap-4 overflow-y-auto rounded-3xl bg-white px-4 py-6 shadow-inner"
            >
              {isLoadingMessages ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                  Loading your conversation...
                </div>
              ) : hasAnyMessages ? (
                combinedMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyState onSelectPrompt={handlePromptSelect} />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 py-3">
            {error && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600"
                >
                  Try Again
                </button>
              </div>
            )}

            {(!isOnline || isOfflineMode) && (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                You're offline. Reconnect to send questions to the assistant.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (!isSendDisabled) {
                        performSend(inputValue, true);
                      }
                    }
                  }}
                  placeholder="Ask about your finances..."
                  rows={1}
                  maxLength={MAX_INPUT_LENGTH}
                  disabled={isSending || !isOnline || isOfflineMode}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-70"
                />
              </div>
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  isSendDisabled
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSending ? "Sending" : "Send"}
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={isOverLimit ? "text-red-500" : "text-gray-500"}>
                {inputValue.length}/{MAX_INPUT_LENGTH}
              </span>
              <span className="text-gray-400">Press Enter to send, Shift+Enter for a new line</span>
            </div>
          </div>

          <div className="px-4 pb-4">
            <BottomNav />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
