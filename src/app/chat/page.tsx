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
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function ChatPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string; retryable: boolean } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [originalQuery, setOriginalQuery] = useState<string>('');
  const [retryDisabled, setRetryDisabled] = useState(false);

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
    if (!messageToSend || isLoading || !user || !isOnline) return;

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

      // If responding to clarification, include the original query context
      let messageContext = messageToSend;
      if (awaitingClarification && originalQuery) {
        // The conversation history already contains the clarification question
        // Just send the user's response normally
        messageContext = messageToSend;
      } else if (!awaitingClarification) {
        // This is a new query, store it in case clarification is needed
        setOriginalQuery(messageToSend);
      }

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageContext,
          conversationHistory,
          isRespondingToClarification: awaitingClarification
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors
        if (response.status === 401 || errorData.code === 'AUTH_ERROR') {
          setError({
            message: errorData.error || 'Your session has expired. Please log in again.',
            code: 'AUTH_ERROR',
            retryable: false
          });
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }
        
        // Handle rate limit errors
        if (response.status === 429 || errorData.code === 'RATE_LIMIT') {
          setError({
            message: errorData.error || 'Too many requests. Please wait a moment and try again.',
            code: 'RATE_LIMIT',
            retryable: true
          });
          // Disable retry button for 5 seconds
          setRetryDisabled(true);
          setTimeout(() => {
            setRetryDisabled(false);
          }, 5000);
          return;
        }
        
        // Handle no data errors
        if (errorData.code === 'NO_DATA') {
          setError({
            message: errorData.error || "I couldn't find transactions for that request. Try another timeframe or category.",
            code: 'NO_DATA',
            retryable: false
          });
          return;
        }
        
        // Handle validation errors
        if (errorData.code === 'VALIDATION_ERROR') {
          setError({
            message: errorData.error || 'Invalid message format.',
            code: 'VALIDATION_ERROR',
            retryable: false
          });
          return;
        }
        
        // Generic API error
        setError({
          message: errorData.error || "I'm having trouble right now. Please try again.",
          code: errorData.code || 'API_ERROR',
          retryable: true
        });
        return;
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

      // Handle clarification flow
      if (data.requiresClarification && !awaitingClarification) {
        // Assistant is asking for clarification
        setAwaitingClarification(true);
      } else if (awaitingClarification) {
        // User responded to clarification, reset state
        setAwaitingClarification(false);
        setOriginalQuery('');
      }

    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Handle network errors or other unexpected errors
      setError({
        message: "I'm having trouble right now. Please try again.",
        code: 'API_ERROR',
        retryable: true
      });
      
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
    if (lastUserMessage && !retryDisabled) {
      setError(null);
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
      
      {!isOnline && (
        <div className="px-4 py-3 bg-orange-50 border-t border-orange-200">
          <div className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-orange-600 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
              />
            </svg>
            <p className="text-sm text-orange-700">
              You're offline. Chat history is available, but you can't send new messages until you're back online.
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className={`px-4 py-3 border-t ${
          error.code === 'NO_DATA' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm flex-1 ${
              error.code === 'NO_DATA' 
                ? 'text-yellow-700' 
                : 'text-red-600'
            }`}>
              {error.message}
            </p>
            {error.retryable && lastUserMessage && (
              <button
                onClick={handleRetry}
                disabled={isLoading || retryDisabled}
                className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  error.code === 'NO_DATA'
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {retryDisabled ? 'Wait...' : 'Try again'}
              </button>
            )}
          </div>
        </div>
      )}
      
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={isLoading || !isOnline}
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
