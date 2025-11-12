"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  "How much did I spend this month?",
  "What's my biggest expense category?",
  "Show me my income vs expenses",
];

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center px-4 py-8"
    >
      {/* Icon */}
      <div className="mb-6 p-4 bg-blue-50 rounded-full">
        <MessageCircle size={48} className="text-[#3B82F6]" />
      </div>

      {/* Welcome message */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Ask me anything about your finances
      </h2>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 mb-8 max-w-md">
        I can help you analyze your spending, income, and financial trends
      </p>

      {/* Suggested prompts */}
      <div className="w-full max-w-md space-y-3">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">
          Try asking:
        </p>
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPromptClick(prompt)}
            className="w-full p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <span className="text-sm text-gray-700">{prompt}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
