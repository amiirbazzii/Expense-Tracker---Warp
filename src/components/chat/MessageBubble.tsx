"use client";

import React from 'react';
import { Message } from '@/lib/chat/chatStorage';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // If less than 24 hours, show relative time
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      const minutes = Math.floor((diffInHours - hours) * 60);
      
      if (hours === 0) {
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }

    // Otherwise show absolute time
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isClarification = !isUser && message.metadata?.requiresClarification;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-xl ${
            isUser
              ? 'bg-[#e1e1e1] text-black'
              : isClarification
              ? 'bg-blue-50 border-2 border-blue-300 text-black'
              : 'bg-white border border-[#D3D3D3] text-black'
          }`}
        >
          {isClarification && (
            <div className="flex items-center gap-2 mb-2 text-blue-600 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Clarification needed</span>
            </div>
          )}
          <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className="text-xs text-gray-500 mt-1 px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
};
