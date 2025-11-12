"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  disabled?: boolean;
}

const MAX_CHARS = 500;
const SHOW_COUNTER_THRESHOLD = 400;

export function ChatInput({ value, onChange, onSend, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [charCount, setCharCount] = useState(0);

  // Auto-focus textarea on component mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Update character count
  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Enforce character limit
    if (newValue.length <= MAX_CHARS) {
      onChange(newValue);
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send
  const handleSend = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
    }
  };

  // Check if send button should be disabled
  const isSendDisabled = disabled || !value.trim();

  // Show character counter when approaching limit
  const showCounter = charCount > SHOW_COUNTER_THRESHOLD;

  return (
    <div className="flex flex-col gap-2">
      {/* Character counter */}
      {showCounter && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-gray-500 text-right"
        >
          {charCount}/{MAX_CHARS}
        </motion.div>
      )}

      {/* Input container */}
      <div className="flex gap-2 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 text-base text-gray-900 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400"
            style={{
              minHeight: "48px",
              maxHeight: "120px", // 4 visible lines approximately
              overflowY: "auto",
            }}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileTap={{ scale: isSendDisabled ? 1 : 0.95 }}
          onClick={handleSend}
          disabled={isSendDisabled}
          className={`p-3 rounded-2xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
            isSendDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#3B82F6] hover:bg-[#2563EB]"
          }`}
          aria-label="Send message"
        >
          <Send
            size={20}
            className={isSendDisabled ? "text-gray-500" : "text-white"}
          />
        </motion.button>
      </div>
    </div>
  );
}
