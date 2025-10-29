/**
 * Chat Storage Module
 * 
 * Handles persistence of chat messages to localStorage with user-specific storage keys.
 * Implements message history trimming to maintain a maximum of 100 messages per user.
 */

/**
 * Message interface representing a single chat message
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    requiresClarification?: boolean;
    functionCalled?: string;
    functionResult?: any;
  };
}

/**
 * ChatHistory interface for localStorage structure
 */
export interface ChatHistory {
  userId: string;
  messages: Message[];
  lastUpdated: number;
}

/**
 * Maximum number of messages to keep in history
 */
const MAX_MESSAGES = 100;

/**
 * Generate storage key for a specific user
 */
function getStorageKey(userId: string): string {
  return `chat_history_${userId}`;
}

/**
 * Save chat history to localStorage
 * Automatically trims messages to MAX_MESSAGES if exceeded
 * 
 * @param userId - The user identifier
 * @param messages - Array of messages to save
 */
export function saveChatHistory(userId: string, messages: Message[]): void {
  try {
    // Trim messages if they exceed the maximum
    const trimmedMessages = messages.length > MAX_MESSAGES
      ? messages.slice(-MAX_MESSAGES)
      : messages;

    const chatHistory: ChatHistory = {
      userId,
      messages: trimmedMessages,
      lastUpdated: Date.now(),
    };

    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(chatHistory));
  } catch (error) {
    console.error('Failed to save chat history:', error);
    // Silently fail - don't break the app if localStorage is unavailable
  }
}

/**
 * Load chat history from localStorage
 * 
 * @param userId - The user identifier
 * @returns Array of messages, or empty array if no history exists
 */
export function loadChatHistory(userId: string): Message[] {
  try {
    const storageKey = getStorageKey(userId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return [];
    }

    const chatHistory: ChatHistory = JSON.parse(stored);

    // Verify the userId matches (security check)
    if (chatHistory.userId !== userId) {
      console.warn('Chat history userId mismatch, clearing history');
      clearChatHistory(userId);
      return [];
    }

    return chatHistory.messages || [];
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

/**
 * Clear chat history for a specific user
 * 
 * @param userId - The user identifier
 */
export function clearChatHistory(userId: string): void {
  try {
    const storageKey = getStorageKey(userId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}

/**
 * Add a single message to the chat history
 * Automatically saves to localStorage and trims if necessary
 * 
 * @param userId - The user identifier
 * @param message - The message to add
 */
export function addMessage(userId: string, message: Message): void {
  const currentHistory = loadChatHistory(userId);
  const updatedHistory = [...currentHistory, message];
  saveChatHistory(userId, updatedHistory);
}

/**
 * Get the number of messages in the chat history
 * 
 * @param userId - The user identifier
 * @returns Number of messages
 */
export function getMessageCount(userId: string): number {
  const messages = loadChatHistory(userId);
  return messages.length;
}

/**
 * Check if chat history exists for a user
 * 
 * @param userId - The user identifier
 * @returns True if history exists, false otherwise
 */
export function hasChatHistory(userId: string): boolean {
  return getMessageCount(userId) > 0;
}
