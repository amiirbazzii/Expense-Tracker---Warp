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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-bounce-in">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-[#e1e1e1] to-[#d7d7d7] rounded-2xl shadow-sm">
              <Sparkles className="w-10 h-10 text-black" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-black">
              Ask about your finances
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Try one of these questions to get started
            </p>
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-3">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt)}
              className="w-full text-left px-5 py-4 bg-white border border-[#D3D3D3] rounded-2xl hover:border-black hover:shadow-lg transition-all active:scale-[0.98] active:bg-[#f8f8f8] group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <svg 
                  className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                  />
                </svg>
                <p className="text-[15px] text-black leading-relaxed flex-1">{prompt}</p>
                <svg 
                  className="w-5 h-5 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
