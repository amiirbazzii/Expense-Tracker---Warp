"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (retryMessage?: string) => void;
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
  
  // Performance optimization: Debounce submit to prevent rapid submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 300; // 300ms debounce

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isSubmitting) {
        handleSubmit();
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
    if (value.trim() && !disabled && !isSubmitting) {
      // Performance optimization: Debounce to prevent rapid submissions
      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
      
      if (timeSinceLastSubmit < DEBOUNCE_DELAY) {
        // Too soon, schedule for later
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
        }
        
        submitTimeoutRef.current = setTimeout(() => {
          setIsSubmitting(true);
          lastSubmitTimeRef.current = Date.now();
          onSubmit();
          setTimeout(() => setIsSubmitting(false), 100);
        }, DEBOUNCE_DELAY - timeSinceLastSubmit);
        
        return;
      }
      
      // Submit immediately
      setIsSubmitting(true);
      lastSubmitTimeRef.current = now;
      onSubmit();
      setTimeout(() => setIsSubmitting(false), 100);
    }
  };

  return (
    <div className="border-t border-[#D3D3D3] bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-end gap-3">
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
            className={`w-full px-4 py-3 pr-16 rounded-2xl border resize-none outline-none transition-all text-black placeholder:text-gray-400 ${
              disabled
                ? 'bg-[#f8f8f8] border-[#D3D3D3] text-gray-400 cursor-not-allowed'
                : 'bg-[#f8f8f8] border-[#D3D3D3] focus:border-black focus:shadow-[inset_0px_0px_0px_1px_#000] focus:bg-white'
            }`}
            style={{
              minHeight: '52px',
              maxHeight: '120px',
              lineHeight: '24px'
            }}
          />
          <div
            id="char-count"
            className={`absolute bottom-3 right-3 text-xs font-medium transition-colors ${
              charCount > maxChars * 0.9 
                ? 'text-red-500' 
                : charCount > maxChars * 0.75 
                ? 'text-orange-500' 
                : 'text-gray-400'
            }`}
          >
            {charCount}/{maxChars}
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim() || isSubmitting}
          aria-label="Send message"
          className={`p-3.5 rounded-2xl transition-all shadow-sm ${
            disabled || !value.trim() || isSubmitting
              ? 'bg-[#e1e1e1] text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-black text-white hover:bg-gray-800 active:bg-gray-900 active:scale-95'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2.5 px-1">
        Press <span className="font-medium">Enter</span> to send, <span className="font-medium">Shift+Enter</span> for new line
      </p>
    </div>
  );
};
