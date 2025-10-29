"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [charCount, setCharCount] = useState(0);
  const maxChars = 500;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 4 * 24; // 4 lines * 24px line height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  // Update character count
  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxChars) {
      onChange(newValue);
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="border-t border-[#D3D3D3] bg-white p-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            disabled={disabled}
            aria-label="Type your question"
            aria-describedby="char-count"
            className={`w-full px-4 py-3 rounded-xl border resize-none outline-none transition-all text-black ${
              disabled
                ? 'bg-[#f8f8f8] border-[#D3D3D3] text-gray-400 cursor-not-allowed'
                : 'bg-[#f8f8f8] border-[#D3D3D3] focus:border-black focus:shadow-[inset_0px_0px_0px_1px_#000]'
            }`}
            style={{
              minHeight: '48px',
              maxHeight: '96px',
              lineHeight: '24px'
            }}
          />
          <div
            id="char-count"
            className={`absolute bottom-2 right-2 text-xs ${
              charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {charCount}/{maxChars}
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={`p-3 rounded-xl transition-all ${
            disabled || !value.trim()
              ? 'bg-[#e1e1e1] text-gray-400 cursor-not-allowed'
              : 'bg-[#e1e1e1] text-black hover:bg-[#d7d7d7] active:bg-[#cecece]'
          }`}
        >
          <Send className="w-6 h-6" />
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
