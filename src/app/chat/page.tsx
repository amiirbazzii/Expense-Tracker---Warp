"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

// Component imports
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { LoadingIndicator } from "./LoadingIndicator";

export default function ChatPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  // Fetch messages
  const messages = useQuery(
    api.chat.getMessages,
    token ? { token } : "skip"
  );

  // Send message action
  const sendMessageAction = useAction(api.chat.sendMessage);

  // Retry message action
  const retryMessageAction = useAction(api.chat.retryLastMessage);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (messages && messages.length > 0 && !userHasScrolledUp) {
      scrollToBottom();
    }
  }, [messages, userHasScrolledUp]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setUserHasScrolledUp(!isAtBottom);
  };

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!token || !content.trim()) return;

    setIsLoadingResponse(true);
    setInputValue("");

    try {
      await sendMessageAction({
        token,
        content: content.trim(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    if (!token) return;

    setIsLoadingResponse(true);

    try {
      await retryMessageAction({ token });
    } catch (error) {
      console.error("Failed to retry message:", error);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Handle suggested prompt click
  const handleSuggestedPromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const hasMessages = messages && messages.length > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AppHeader title="Chat" />

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-[76px] pb-4 px-4 max-w-3xl mx-auto w-full"
      >
        {/* Empty State */}
        {!hasMessages && (
          <div className="flex items-center justify-center h-full">
            <EmptyState onPromptClick={handleSuggestedPromptClick} />
          </div>
        )}

        {/* Messages List */}
        {hasMessages && (
          <div className="space-y-2">
            {messages.map((message: any, index: number) => (
              <MessageBubble
                key={message._id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                isLatest={index === messages.length - 1}
              />
            ))}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoadingResponse && <LoadingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 bg-white p-4 max-w-3xl mx-auto w-full mb-16 md:mb-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isLoadingResponse}
        />
      </div>

      <BottomNav />
    </div>
  );
}
