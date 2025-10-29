"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message, loadChatHistory, saveChatHistory } from '@/lib/chat/chatStorage';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts';
import { AppHeader } from '@/components/AppHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';

function ChatPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

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

  const handleSubmit = async (retryMessage?: string) => {
    const messageToSend = retryMessage || inputValue.trim();
    if (!messageToSend || isLoading || !user) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: messageToSend,
      timestamp: Date.now()
    };

    // Optimistically add user message
    setMessages(prev => [...prev, userMessage]);
    setLastUserMessage(messageToSend);
    
    if (!retryMessage) {
      setInputValue('');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('AUTH_ERROR');
      }

      // Prepare conversation history for API (convert to OpenRouter format)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors
        if (response.status === 401 || errorData.code === 'AUTH_ERROR') {
          setError('Your session has expired. Please log in again.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Create assistant message
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp,
        metadata: {
          requiresClarification: data.requiresClarification
        }
      };

      // Append assistant response to message history
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Don't show error for auth errors (already handled)
      if (err.message !== 'AUTH_ERROR') {
        setError(err.message || "I'm having trouble right now. Please try again.");
      }
      
      // Remove the optimistically added user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      
      // Restore the input value so user can retry (only if not a retry)
      if (!retryMessage) {
        setInputValue(messageToSend);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSubmit(lastUserMessage);
    }
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
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            {!error.includes('session has expired') && lastUserMessage && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try again
              </button>
            )}
          </div>
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

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
