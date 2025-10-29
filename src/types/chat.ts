/**
 * Chat message data models and types
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

export interface ChatHistory {
  userId: string;
  messages: Message[];
  lastUpdated: number;
}
