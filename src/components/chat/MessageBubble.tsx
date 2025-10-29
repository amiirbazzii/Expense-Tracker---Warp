"use client";

import React from 'react';
import { Message } from '@/lib/chat/chatStorage';
import { useSettings } from '@/contexts/SettingsContext';
import { formatChatTimestamp, formatCurrencyInMessage } from '@/lib/chat/formatters';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const { settings } = useSettings();
  
  // Get user preferences with defaults
  const currency = settings?.currency || 'USD';
  const calendar = settings?.calendar || 'gregorian';
  const language = settings?.language || 'en';
  const isRTL = language === 'fa';

  // Format timestamp based on user's calendar preference
  const formattedTimestamp = formatChatTimestamp(message.timestamp, calendar, language);

  // Format currency amounts in assistant messages
  const formattedContent = !isUser 
    ? formatCurrencyInMessage(message.content, currency)
    : message.content;

  const isClarification = !isUser && message.metadata?.requiresClarification;

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-1 animate-fade-in`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm transition-all ${
            isUser
              ? 'bg-[#e1e1e1] text-black rounded-br-md'
              : isClarification
              ? 'bg-blue-50 border-2 border-blue-300 text-black rounded-bl-md'
              : 'bg-white border border-[#D3D3D3] text-black rounded-bl-md hover:shadow-md'
          }`}
        >
          {isClarification && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200">
              <svg 
                className="w-4 h-4 text-blue-600 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span className="text-blue-700 text-sm font-medium">Clarification needed</span>
            </div>
          )}
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {formattedContent}
          </p>
        </div>
        <span className={`text-xs text-gray-500 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {formattedTimestamp}
        </span>
      </div>
    </div>
  );
};
