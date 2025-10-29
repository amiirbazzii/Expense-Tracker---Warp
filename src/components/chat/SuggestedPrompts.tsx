"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  "How much did I spend on coffee last month?",
  "Did I spend more on investments or coffee in the last 5 months?",
  "Top 3 categories last quarter"
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-[#e1e1e1] rounded-full">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-black">
            Ask about your finances
          </h2>
          <p className="text-gray-600">
            Try one of these questions to get started
          </p>
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-3">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt)}
              className="w-full text-left px-4 py-3 bg-white border border-[#D3D3D3] rounded-xl hover:border-black hover:shadow-[inset_0px_0px_0px_1px_#000] transition-all active:bg-[#f8f8f8]"
            >
              <p className="text-base text-black">{prompt}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
