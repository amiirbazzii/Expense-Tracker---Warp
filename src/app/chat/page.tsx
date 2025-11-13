"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Component imports
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { LoadingIndicator } from "./LoadingIndicator";

function ChatPageContent() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Scroll to bottom when optimistic message or loading state changes
  useEffect(() => {
    if ((optimisticMessage || isLoadingResponse) && !userHasScrolledUp) {
      scrollToBottom();
    }
  }, [optimisticMessage, isLoadingResponse, userHasScrolledUp]);

  // Clear optimistic message when it appears in the actual messages
  useEffect(() => {
    if (optimisticMessage && messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user" && lastMessage.content === optimisticMessage) {
        setOptimisticMessage(null);
      }
    }
  }, [messages, optimisticMessage]);

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

    const trimmedContent = content.trim();
    
    // Clear any previous errors
    setError(null);
    
    // Optimistic update: show user message immediately
    setOptimisticMessage(trimmedContent);
    setIsLoadingResponse(true);
    setInputValue("");
    
    // Disable auto-scroll prevention during send
    setUserHasScrolledUp(false);

    try {
      await sendMessageAction({
        token,
        content: trimmedContent,
      });
      
      // Clear optimistic message after successful send
      setOptimisticMessage(null);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Handle authentication errors
      if (error?.message?.includes("Authentication required") || 
          error?.message?.includes("User not found")) {
        router.push("/login");
        return;
      }
      
      // Set error message for display
      setError(error?.message || "I'm having trouble right now. Please try again.");
      
      // Clear optimistic message on error
      setOptimisticMessage(null);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    if (!token) return;

    // Clear error and start loading
    setError(null);
    setIsLoadingResponse(true);
    
    // Disable auto-scroll prevention during retry
    setUserHasScrolledUp(false);

    try {
      await retryMessageAction({ token });
    } catch (error: any) {
      console.error("Failed to retry message:", error);
      
      // Handle authentication errors
      if (error?.message?.includes("Authentication required") || 
          error?.message?.includes("User not found")) {
        router.push("/login");
        return;
      }
      
      // Set error message for display
      setError(error?.message || "I'm having trouble right now. Please try again.");
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
        <div className="text-base text-gray-500">Loading...</div>
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

        {/* Optimistic User Message */}
        {optimisticMessage && (
          <div className="space-y-2 mt-2">
            <MessageBubble
              role="user"
              content={optimisticMessage}
              timestamp={Date.now()}
              isLatest={true}
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoadingResponse && <LoadingIndicator />}

        {/* Error Message */}
        {error && !isLoadingResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl"
          >
            <p className="text-sm text-red-800 mb-3">{error}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

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

// Chat-specific error fallback component
function ChatErrorFallback() {
  const router = useRouter();

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AppHeader title="Chat" />
      
      <div className="flex-1 flex items-center justify-center p-4 pt-[76px]">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg 
              className="mx-auto h-16 w-16" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an error while loading the chat. This has been logged for debugging.
          </p>
          
          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReload}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGoBack}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </motion.button>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}

// Wrap chat page with error boundary
export default function ChatPage() {
  return (
    <ErrorBoundary redirectToHome={false}>
      <ChatPageContent />
    </ErrorBoundary>
  );
}
