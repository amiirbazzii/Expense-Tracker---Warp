"use client";

import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDate } from "@/lib/formatters";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isLatest?: boolean;
}

export function MessageBubble({ role, content, timestamp, isLatest }: MessageBubbleProps) {
  const { settings } = useSettings();

  // Format timestamp as relative time (<1 hour) or absolute time (≥1 hour)
  const formatTimestamp = (ts: number) => {
    const now = Date.now();
    const diffMs = now - ts;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      if (diffMinutes < 1) {
        return "Just now";
      }
      return `${diffMinutes}m ago`;
    }

    // Use absolute time for messages ≥1 hour old
    const calendar = settings?.calendar || "gregorian";
    return formatDate(ts, calendar, "MMM d, h:mm a");
  };

  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-[#3B82F6] text-white"
              : "bg-[#F3F4F6] text-gray-900"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
        <span className="text-xs text-gray-500 mt-1 px-1">
          {formatTimestamp(timestamp)}
        </span>
      </div>
    </motion.div>
  );
}
