"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message, loadChatHistory, saveChatHistory } from '@/lib/chat/chatStorage';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts';
import { AppHeader } from '@/components/AppHeader';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (user?._id) {
        try {
          const history = await loadChatHistory(user._id);
          setMessages(history);
        } catch (err) {
          console.error('Failed to load chat history:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();
  }, [user?._id]);

  // Save chat history whenever messages change
  useEffect(() => {
    const saveHistory = async () => {
      if (user?._id && messages.length > 0) {
        try {
          await saveChatHistory(user._id, messages);
        } catch (err) {
          console.error('Failed to save chat history:', err);
        }
      }
    };

    saveHistory();
  }, [messages, user?._id]);

  const handleSelectPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    // Optimistically add user message
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // TODO: Call API endpoint in next task
    // For now, just simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: 'This is a placeholder response. The API integration will be implemented in the next task.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-screen bg-[#f8f8f8]">
        <AppHeader title="Chat" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading chat history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f8f8] pt-[64px]">
      <AppHeader title="Chat" />
      
      {messages.length === 0 ? (
        <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}
      
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
