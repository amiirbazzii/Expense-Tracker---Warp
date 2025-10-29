/**
 * Tests for chat storage functionality
 */

import {
  Message,
  ChatHistory,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
  addMessage,
  getMessageCount,
  hasChatHistory,
} from '../src/lib/chat/chatStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Chat Storage', () => {
  const testUserId = 'test-user-123';
  const testMessage: Message = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how much did I spend?',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('saveChatHistory and loadChatHistory', () => {
    it('should save and load chat history', () => {
      const messages = [testMessage];
      saveChatHistory(testUserId, messages);

      const loaded = loadChatHistory(testUserId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(testMessage.id);
      expect(loaded[0].content).toBe(testMessage.content);
    });

    it('should return empty array when no history exists', () => {
      const loaded = loadChatHistory('non-existent-user');
      expect(loaded).toEqual([]);
    });

    it('should trim messages to max 100', () => {
      const messages: Message[] = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      }));

      saveChatHistory(testUserId, messages);
      const loaded = loadChatHistory(testUserId);

      expect(loaded).toHaveLength(100);
      expect(loaded[0].id).toBe('msg-50'); // First 50 should be trimmed
      expect(loaded[99].id).toBe('msg-149'); // Last message should be kept
    });
  });

  describe('clearChatHistory', () => {
    it('should clear chat history for a user', () => {
      saveChatHistory(testUserId, [testMessage]);
      expect(loadChatHistory(testUserId)).toHaveLength(1);

      clearChatHistory(testUserId);
      expect(loadChatHistory(testUserId)).toEqual([]);
    });
  });

  describe('addMessage', () => {
    it('should add a message to existing history', () => {
      saveChatHistory(testUserId, [testMessage]);

      const newMessage: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'You spent $500 last month.',
        timestamp: Date.now(),
      };

      addMessage(testUserId, newMessage);

      const loaded = loadChatHistory(testUserId);
      expect(loaded).toHaveLength(2);
      expect(loaded[1].id).toBe(newMessage.id);
    });

    it('should create new history if none exists', () => {
      addMessage(testUserId, testMessage);

      const loaded = loadChatHistory(testUserId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(testMessage.id);
    });
  });

  describe('getMessageCount', () => {
    it('should return correct message count', () => {
      expect(getMessageCount(testUserId)).toBe(0);

      saveChatHistory(testUserId, [testMessage]);
      expect(getMessageCount(testUserId)).toBe(1);

      addMessage(testUserId, { ...testMessage, id: 'msg-2' });
      expect(getMessageCount(testUserId)).toBe(2);
    });
  });

  describe('hasChatHistory', () => {
    it('should return false when no history exists', () => {
      expect(hasChatHistory(testUserId)).toBe(false);
    });

    it('should return true when history exists', () => {
      saveChatHistory(testUserId, [testMessage]);
      expect(hasChatHistory(testUserId)).toBe(true);
    });
  });

  describe('user-specific storage', () => {
    it('should isolate chat history by userId', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const message1: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'User 1 message',
        timestamp: Date.now(),
      };

      const message2: Message = {
        id: 'msg-2',
        role: 'user',
        content: 'User 2 message',
        timestamp: Date.now(),
      };

      saveChatHistory(user1, [message1]);
      saveChatHistory(user2, [message2]);

      const loaded1 = loadChatHistory(user1);
      const loaded2 = loadChatHistory(user2);

      expect(loaded1).toHaveLength(1);
      expect(loaded1[0].content).toBe('User 1 message');

      expect(loaded2).toHaveLength(1);
      expect(loaded2[0].content).toBe('User 2 message');
    });
  });

  describe('message metadata', () => {
    it('should preserve message metadata', () => {
      const messageWithMetadata: Message = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Response',
        timestamp: Date.now(),
        metadata: {
          requiresClarification: true,
          functionCalled: 'get_category_spending',
          functionResult: { total: 500 },
        },
      };

      saveChatHistory(testUserId, [messageWithMetadata]);
      const loaded = loadChatHistory(testUserId);

      expect(loaded[0].metadata).toBeDefined();
      expect(loaded[0].metadata?.requiresClarification).toBe(true);
      expect(loaded[0].metadata?.functionCalled).toBe('get_category_spending');
      expect(loaded[0].metadata?.functionResult).toEqual({ total: 500 });
    });
  });
});
